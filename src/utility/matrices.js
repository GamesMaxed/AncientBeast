export const diagonalup = {
	data: [
		[0, 0, 0, 0, 1], // Origin line
		[0, 0, 0, 0, 1],
		[0, 0, 0, 1, 0],
		[0, 0, 0, 1, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 1, 0, 0, 0],
		[0, 1, 0, 0, 0],
		[1, 0, 0, 0, 0],
	],
	origin: [4, 0],
};

export const diagonaldown = {
	data: [
		[1, 0, 0, 0, 0], // Origin line
		[0, 1, 0, 0, 0],
		[0, 1, 0, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 1, 0, 0],
		[0, 0, 0, 1, 0],
		[0, 0, 0, 1, 0],
		[0, 0, 0, 0, 1],
		[0, 0, 0, 0, 1],
	],
	origin: [0, 0],
};

export const straitrow = {
	data: [[1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1]], // Origin line
	origin: [0, 0],
};

export const bellowrow = {
	data: [
		[0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0], // Origin line
		[0, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1, 1],
	],
	origin: [0, 0],
};

export const frontnback2hex = {
	data: [
		[0, 0, 0, 0],
		[0, 1, 0, 1],
		[1, 0, 0, 1], // Origin line
		[0, 1, 0, 1],
	],
	origin: [2, 2],
};

export const frontnback3hex = {
	data: [
		[0, 0, 0, 0, 0],
		[0, 1, 0, 0, 1],
		[1, 0, 0, 0, 1], // Origin line
		[0, 1, 0, 0, 1],
	],
	origin: [3, 2],
};

export const front2hex = {
	data: [
		[0, 0, 0, 0],
		[0, 0, 0, 1],
		[0, 0, 0, 1], // Origin line
		[0, 0, 0, 1],
	],

	origin: [2, 2],
};

export const back2hex = {
	data: [
		[0, 0, 0, 0],
		[0, 1, 0, 0],
		[1, 0, 0, 0], // Origin line
		[0, 1, 0, 0],
	],

	origin: [2, 2],
};

export const inlinefront2hex = {
	data: [
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[0, 0, 0, 1], // Origin line
		[0, 0, 0, 0],
	],
	origin: [2, 2],
};

export const inlineback2hex = {
	data: [
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[1, 0, 0, 0], // Origin line
		[0, 0, 0, 0],
	],
	origin: [2, 2],
};

export const inlinefrontnback2hex = {
	data: [
		[0, 0, 0, 0],
		[0, 0, 0, 0],
		[1, 0, 0, 1], // Origin line
		[0, 0, 0, 0],
	],
	origin: [2, 2],
};

export const front1hex = {
	data: [
		[0, 0, 0],
		[0, 0, 1],
		[0, 0, 1], // Origin line
		[0, 0, 1],
	],
	origin: [1, 2],
};

export const backtop1hex = {
	data: [
		[0, 0, 0],
		[0, 1, 0],
		[0, 0, 0], // Origin line
		[0, 0, 0],
	],
	origin: [1, 2],
};

export const inlineback1hex = {
	data: [
		[0, 0, 0],
		[0, 0, 0],
		[1, 0, 0], // Origin line
		[0, 0, 0],
	],
	origin: [1, 2],
};

export const backbottom1hex = {
	data: [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0], // Origin line
		[0, 1, 0],
	],
	origin: [1, 2],
};

export const fronttop1hex = {
	data: [
		[0, 0, 0],
		[0, 0, 1],
		[0, 0, 0], // Origin line
		[0, 0, 0],
	],
	origin: [1, 2],
};

export const inlinefront1hex = {
	data: [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 1], // Origin line
		[0, 0, 0],
	],
	origin: [1, 2],
};

export const frontbottom1hex = {
	data: [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0], // Origin line
		[0, 0, 1],
	],
	origin: [1, 2],
};

export const headlessBoomerang = {
	data: [
		[0, 0, 0, 0, 0],
		[0, 1, 1, 1, 1],
		[0, 1, 1, 1, 1], //origin line
		[0, 1, 1, 1, 1],
	],
	origin: [0, 2],
};

export const headlessBoomerangUpgraded = {
	data: [
		[0, 0, 0, 0, 0, 0],
		[0, 1, 1, 1, 1, 1],
		[0, 1, 1, 1, 1, 1], //origin line
		[0, 1, 1, 1, 1, 1],
	],
	origin: [0, 2],
};
