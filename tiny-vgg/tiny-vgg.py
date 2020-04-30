import tensorflow as tf
import numpy as np
import pandas as pd
import re
from shutil import copyfile
from glob import glob
from json import load, dump
from tensorflow.keras.layers import Dense, Flatten, Conv2D, MaxPool2D,\
    Activation
from tensorflow.keras import Model, Sequential
from os.path import basename
from time import time

print(tf.__version__)


def create_class_dict():
    # Create a new version only including tiny 200 classes
    df = pd.read_csv('./tiny-imagenet-200/words.txt', sep='\t', header=None)
    keys, classes = df[0], df[1]
    class_dict = dict(zip(keys, classes))

    tiny_class_dict = {}
    cur_index = 0

    for directory in glob('./tiny-imagenet-200/train/*'):
        cur_key = basename(directory)
        tiny_class_dict[cur_key] = {'class': class_dict[cur_key],
                                    'index': cur_index}
        cur_index += 1

    dump(tiny_class_dict, open('./tiny-imagenet-200/class_dict.json', 'w'),
         indent=2)


def create_val_class_dict():
    tiny_class_dict = load(open('./tiny-imagenet-200/class_dict.json', 'r'))
    tiny_val_class_dict = {}

    # Create a dictionary for validation images
    df = pd.read_csv('./tiny-imagenet-200/val/val_annotations.txt', sep='\t',
                     header=None)
    image_names = df[0]
    image_classes = df[1]

    for i in range(len(image_names)):
        tiny_val_class_dict[image_names[i]] = {
            'class': tiny_class_dict[image_classes[i]]['class'],
            'index': tiny_class_dict[image_classes[i]]['index'],
        }

    dump(tiny_val_class_dict, open('./tiny-imagenet-200/val_class_dict.json',
                                   'w'),
         indent=2)


def split_val_data():
    # Split validation images to 50% early stopping and 50% hold-out testing
    val_images = glob('./tiny-imagenet-200/val/images/*.JPEG')
    np.random.shuffle(val_images)

    for i in range(len(val_images)):
        if i < len(val_images) // 2:
            copyfile(val_images[i], val_images[i].replace('images',
                                                          'val_images'))
        else:
            copyfile(val_images[i], val_images[i].replace('images',
                                                          'test_images'))


def process_path_train(path):
    """
    Get the (class label, processed image) pair of the given image path. This
    funciton uses python primitives, so you need to use tf.py_funciton wrapper.
    This function uses global variables:

        WIDTH(int): the width of the targeting image
        HEIGHT(int): the height of the targeting iamge
        NUM_CLASS(int): number of classes

    Args:
        path(string): path to an image file
    """

    # Get the class
    path = path.numpy()
    image_name = basename(path.decode('ascii'))
    label_name = re.sub(r'(.+)_\d+\.JPEG', r'\1', image_name)
    label_index = tiny_class_dict[label_name]['index']

    # Convert label to one-hot encoding
    label = tf.one_hot(indices=[label_index], depth=NUM_CLASS)
    label = tf.reshape(label, [NUM_CLASS])

    # Read image and convert the image to [0, 1] range 3d tensor
    img = tf.io.read_file(path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.image.convert_image_dtype(img, tf.float32)
    img = tf.image.resize(img, [WIDTH, HEIGHT])

    return(img, label)


def process_path_test(path):
    """
    Get the (class label, processed image) pair of the given image path. This
    funciton uses python primitives, so you need to use tf.py_funciton wrapper.
    This function uses global variables:

        WIDTH(int): the width of the targeting image
        HEIGHT(int): the height of the targeting iamge
        NUM_CLASS(int): number of classes

    The filepath encoding for test images is different from training images.

    Args:
        path(string): path to an image file
    """

    # Get the class
    path = path.numpy()
    image_name = basename(path.decode('ascii'))
    label_index = tiny_val_class_dict[image_name]['index']

    # Convert label to one-hot encoding
    label = tf.one_hot(indices=[label_index], depth=NUM_CLASS)
    label = tf.reshape(label, [NUM_CLASS])

    # Read image and convert the image to [0, 1] range 3d tensor
    img = tf.io.read_file(path)
    img = tf.image.decode_jpeg(img, channels=3)
    img = tf.image.convert_image_dtype(img, tf.float32)
    img = tf.image.resize(img, [WIDTH, HEIGHT])

    return(img, label)


def prepare_for_training(dataset, batch_size=32, cache=True,
                         shuffle_buffer_size=1000):

    if cache:
        if isinstance(cache, str):
            dataset = dataset.cache(cache)
        else:
            dataset = dataset.cache()

    # Only shuffle elements in the buffer size
    dataset = dataset.shuffle(buffer_size=shuffle_buffer_size)

    # Pre featch batches in the background
    dataset = dataset.batch(batch_size)
    dataset = dataset.prefetch(buffer_size=tf.data.experimental.AUTOTUNE)

    return dataset


def prepare_for_testing(dataset, batch_size=32, cache=True):
    if cache:
        if isinstance(cache, str):
            dataset = dataset.cache(cache)
        else:
            dataset = dataset.cache()

    # Pre featch batches in the background
    dataset = dataset.batch(batch_size)
    dataset = dataset.prefetch(buffer_size=tf.data.experimental.AUTOTUNE)

    return dataset


class TinyVGG(Model):
    """
    Tiny VGG structure is adapted from http://cs231n.stanford.edu:
        > This particular network is classifying CIFAR-10 images into one of 10
        > classes and was trained with ConvNetJS. Its exact architecture is
        > [conv-relu-conv-relu-pool]x3-fc-softmax, for a total of 17 layers and
        > 7000 parameters. It uses 3x3 convolutions and 2x2 pooling regions.
    """
    def __init__(self, filters=10):
        super(TinyVGG, self).__init__()
        self.conv_1_1 = Conv2D(filters, (3, 3), name='conv_1_1')
        self.relu_1_1 = Activation('relu', name='relu_1_1')
        self.conv_1_2 = Conv2D(filters, (3, 3), name='conv_1_2')
        self.relu_1_2 = Activation('relu', name='relu_1_2')
        self.max_pool_1 = MaxPool2D((2, 2), name='max_pool_1')

        self.conv_2_1 = Conv2D(filters, (3, 3), name='conv_2_1')
        self.relu_2_1 = Activation('relu', name='relu_2_1')
        self.conv_2_2 = Conv2D(filters, (3, 3), name='conv_2_2')
        self.relu_2_2 = Activation('relu', name='relu_2_2')
        self.max_pool_2 = MaxPool2D((2, 2), name='max_pool_2')

        self.flatten = Flatten()
        self.fc = Dense(NUM_CLASS, activation='softmax')

    def call(self, x):
        x = self.conv_1_1(x)
        x = self.relu_1_1(x)
        x = self.conv_1_2(x)
        x = self.relu_1_2(x)
        x = self.max_pool_1(x)

        x = self.conv_2_1(x)
        x = self.relu_2_1(x)
        x = self.conv_2_2(x)
        x = self.relu_2_2(x)
        x = self.max_pool_2(x)

        x = self.conv_3_1(x)
        x = self.relu_3_1(x)
        x = self.conv_3_2(x)
        x = self.relu_3_2(x)
        x = self.max_pool_3(x)

        x = self.flatten(x)
        return self.fc(x)


@tf.function
def train_step(image_batch, label_batch):
    with tf.GradientTape() as tape:
        # Predict
        predictions = tiny_vgg(image_batch)

        # Update gradient
        loss = loss_object(label_batch, predictions)
        gradients = tape.gradient(loss, tiny_vgg.trainable_variables)
        optimizer.apply_gradients(zip(gradients, tiny_vgg.trainable_variables))

        train_mean_loss(loss)
        train_accuracy(label_batch, predictions)


@tf.function
def vali_step(image_batch, label_batch):
    predictions = tiny_vgg(image_batch)
    vali_loss = loss_object(label_batch, predictions)

    vali_mean_loss(vali_loss)
    vali_accuracy(label_batch, predictions)


@tf.function
def test_step(image_batch, label_batch):
    predictions = tiny_vgg(image_batch)
    test_loss = loss_object(label_batch, predictions)

    test_mean_loss(test_loss)
    test_accuracy(label_batch, predictions)


WIDTH = 64
HEIGHT = 64
EPOCHS = 1000
PATIENCE = 50
LR = 0.001
NUM_CLASS = 10
BATCH_SIZE = 32

# Create training and validation dataset
tiny_class_dict = load(open('./data/class_dict_10.json', 'r'))
tiny_val_class_dict = load(open('./data/val_class_dict_10.json', 'r'))

training_images = './data/class_10_train/*/images/*.JPEG'
vali_images = './data/class_10_val/val_images/*.JPEG'
test_images = './data/class_10_val/test_images/*.JPEG'

# Create training dataset
train_path_dataset = tf.data.Dataset.list_files(training_images)

train_labeld_dataset = train_path_dataset.map(
    lambda path: tf.py_function(
        process_path_train,
        [path],
        [tf.float32, tf.float32]
    )
)

# Create vali dataset
vali_path_dataset = tf.data.Dataset.list_files(vali_images)

vali_labeld_dataset = vali_path_dataset.map(
    lambda path: tf.py_function(
        process_path_test,
        [path],
        [tf.float32, tf.float32]
    )
)

# Create test dataset
test_path_dataset = tf.data.Dataset.list_files(test_images)

test_labeld_dataset = test_path_dataset.map(
    lambda path: tf.py_function(
        process_path_test,
        [path],
        [tf.float32, tf.float32]
    )
)

train_dataset = prepare_for_training(train_labeld_dataset,
                                     batch_size=BATCH_SIZE)
vali_dataset = prepare_for_training(vali_labeld_dataset,
                                    batch_size=BATCH_SIZE)
test_dataset = prepare_for_training(test_labeld_dataset,
                                    batch_size=BATCH_SIZE)

# Create an instance of the model
# tiny_vgg = TinyVGG()

# Use Keras Sequential API instead, since it is easy to save the model
filters = 10
tiny_vgg = Sequential([
    Conv2D(filters, (3, 3), input_shape=(64, 64, 3), name='conv_1_1'),
    Activation('relu', name='relu_1_1'),
    Conv2D(filters, (3, 3), name='conv_1_2'),
    Activation('relu', name='relu_1_2'),
    MaxPool2D((2, 2), name='max_pool_1'),

    Conv2D(filters, (3, 3), name='conv_2_1'),
    Activation('relu', name='relu_2_1'),
    Conv2D(filters, (3, 3), name='conv_2_2'),
    Activation('relu', name='relu_2_2'),
    MaxPool2D((2, 2), name='max_pool_2'),

    Flatten(name='flatten'),
    Dense(NUM_CLASS, activation='softmax', name='output')
])

# "Compile" the model with loss function and optimizer
loss_object = tf.keras.losses.CategoricalCrossentropy()
# optimizer = tf.keras.optimizers.Adam(learning_rate=LR)
optimizer = tf.keras.optimizers.SGD(learning_rate=LR)

train_mean_loss = tf.keras.metrics.Mean(name='train_mean_loss')
train_accuracy = tf.keras.metrics.CategoricalAccuracy(name='train_accuracy')

vali_mean_loss = tf.keras.metrics.Mean(name='vali_mean_loss')
vali_accuracy = tf.keras.metrics.CategoricalAccuracy(name='vali_accuracy')

# Initialize early stopping parameters
no_improvement_epochs = 0
best_vali_loss = np.inf
start_time = time()
print('Start training.\n')

for epoch in range(EPOCHS):
    # Train
    for image_batch, label_batch in train_dataset:
        train_step(image_batch, label_batch)

    # Predict on the test dataset
    for image_batch, label_batch in vali_dataset:
        vali_step(image_batch, label_batch)

    template = 'epoch: {}, train loss: {:.4f}, train accuracy: {:.4f}, '
    template += 'vali loss: {:.4f}, vali accuracy: {:.4f}'
    print(template.format(epoch + 1,
                          train_mean_loss.result(),
                          train_accuracy.result() * 100,
                          vali_mean_loss.result(),
                          vali_accuracy.result() * 100))

    # Early stopping
    if vali_mean_loss.result() < best_vali_loss:
        no_improvement_epochs = 0
        best_vali_loss = vali_mean_loss.result()
        # Save the best model
        tiny_vgg.save('trained_vgg_best.h5')
    else:
        no_improvement_epochs += 1

    if no_improvement_epochs >= PATIENCE:
        print('Early stopping at epoch = {}'.format(epoch))
        break

    # Reset evaluation metrics
    train_mean_loss.reset_states()
    train_accuracy.reset_states()
    vali_mean_loss.reset_states()
    vali_accuracy.reset_states()

print('\nFinished training, used {:.4f} mins.'.format((time() -
                                                       start_time) / 60))
# Save trained model
tiny_vgg.save('trained_tiny_vgg.h5')
tiny_vgg = tf.keras.models.load_model('trained_vgg_best.h5')

# Test on hold-out test images
test_mean_loss = tf.keras.metrics.Mean(name='test_mean_loss')
test_accuracy = tf.keras.metrics.CategoricalAccuracy(name='test_accuracy')

for image_batch, label_batch in test_dataset:
    test_step(image_batch, label_batch)

template = '\ntest loss: {:.4f}, test accuracy: {:.4f}'
print(template.format(test_mean_loss.result(),
                      test_accuracy.result() * 100))

