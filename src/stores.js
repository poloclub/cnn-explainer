import { writable } from 'svelte/store';

export const cnnStore = writable([]);
export const svgStore = writable(undefined);

export const vSpaceAroundGapStore = writable(undefined);
export const hSpaceAroundGapStore = writable(undefined);

export const nodeCoordinateStore = writable([]);
export const selectedScaleLevelStore = writable(undefined);

export const cnnLayerRangesStore = writable({});
export const cnnLayerMinMaxStore = writable([]);

export const needRedrawStore = writable([undefined, undefined]);

export const detailedModeStore = writable(true);

export const shouldIntermediateAnimateStore = writable(false);

export const isInSoftmaxStore = writable(false);
export const softmaxDetailViewStore = writable({});
export const allowsSoftmaxAnimationStore = writable(false);

export const hoverInfoStore = writable({});

export const modalStore = writable({});

export const intermediateLayerPositionStore = writable({});