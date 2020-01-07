import tensorflow as tf
from json import dump

assert(int(tf.__version__.split('.')[0]) == 2)


def convert_h5_to_json(model_h5_file, model_json_file):
    """
    Helper function to convert tf2 stored model h5 file to a customized json
    format.

    Args:
        model_h5_file(string): filename of the stored h5 file
        model_json_file(string): filename of the output json file
    """

    model = tf.keras.models.load_model(model_h5_file)
    json_dict = {}

    for l in model.layers:
        json_dict[l.name] = {
            'input_shape': l.input_shape[1:],
            'output_shape': l.output_shape[1:],
            'num_neurons': l.output_shape[-1]
        }

        if 'conv' in l.name:
            all_weights = l.weights[0]
            neuron_weights = []

            # Iterate through neurons in that layer
            for n in range(all_weights.shape[3]):
                cur_neuron_dict = {}
                cur_neuron_dict['bias'] = l.bias.numpy()[n].item()

                # Get the current weights
                cur_weights = all_weights[:, :, :, n].numpy().astype(float)

                # Reshape the weights from (height, width, input_c) to
                # (input_c, height, width)
                cur_weights = cur_weights.transpose((2, 0, 1)).tolist()
                cur_neuron_dict['weights'] = cur_weights

                neuron_weights.append(cur_neuron_dict)

            json_dict[l.name]['weights'] = neuron_weights

        elif 'output' in l.name:
            all_weights = l.weights[0]
            neuron_weights = []

            # Iterate through neurons in that layer
            for n in range(all_weights.shape[1]):
                cur_neuron_dict = {}
                cur_neuron_dict['bias'] = l.bias.numpy()[n].item()

                # Get the current weights
                cur_weights = all_weights[:, n].numpy().astype(float).tolist()
                cur_neuron_dict['weights'] = cur_weights

                neuron_weights.append(cur_neuron_dict)

            json_dict[l.name]['weights'] = neuron_weights

    dump(json_dict, open(model_json_file, 'w'), indent=2)
