// export interface KMeans {
// 	it: number;
// 	k: number;
// 	indexes: Array<number>;
// 	centroids: Centroids;
// }

// export type Vector = Array<number>;
// export type Centroids = Array<number>;

// const MAX: number = 10000;

// function init(len: number, val: number, v: Array<number>): Array<number> {
// 	v = v || [];
// 	for (let i = 0; i < len; i++) {
// 		v[i] = val;
// 	}
// 	return v;
// }

// function kmeans(
// 	// data: Array<Vector>,
// 	data,
// 	k: number,
// 	type?: string,
// 	max_it?: number,
// 	fn_dist?: Function
// ): KMeans {
// 	let cents: Array<Centroids> = [];
// 	// let cents = [];
// 	let indexes: Array<number> = [];
// 	let cent_moved: boolean = false;
// 	let iterations: number = max_it || MAX;
// 	var count: Array<number> = [];

// 	if (!type) {
// 		let def_indexes = {};
// 		let i: number = 0;
// 		while (cents.length < k) {
// 			let idx = Math.floor(Math.random() * data.length);
// 			if (!def_indexes[idx]) {
// 				def_indexes[idx] = true;
// 				cents[i++] = data[idx];
// 			}
// 		}
// 	} else if (type === "kmeans") {
// 		cents = Cluster.k_means(data, k);
// 	} else if (type === "kmeans++") {
// 		cents = Cluster.k_means_pp(data, k, fn_dist);
// 	}
// 	// console.log("cents" + cents);

// 	// For Each Iteration
// 	do {
// 		// Reset k count
// 		init(k, 0, count);

// 		// For each value in data, find the nearest centroid
// 		for (const i in data) {
// 			let min: number = Infinity;
// 			let idx: number = 0;
// 			for (let j = 0; j < k; j++) {
// 				// Custom, Multidimensional or unidimensional
// 				let dist: number = fn_dist
// 					? fn_dist(data[i], cents[j])
// 					: data[0].length > 0
// 					? Distance.euclideanDist(data[i], cents[j])
// 					: Math.abs(data[i][0] - cents[j][0]);
// 				// console.log(data[i], cents[j], Math.abs(data[i] - cents[j]));

// 				if (dist <= min) {
// 					min = dist;
// 					idx = j;
// 				}
// 			}
// 			indexes[i] = idx; // Index of the selected centroid for that value
// 			count[idx]++; // Number of values for this centroid
// 		}

// 		// Recalculate centroids
// 		let sum: Array<Array<number>> = [];
// 		// let sum = [];
// 		let old: Array<Array<number>> = [];
// 		let dif: number = 0;
// 		if (data[0].length > 0) {
// 			for (let j = 0; j < k; j++) {
// 				sum[j] = init(data[0].length, 0, sum[j]);
// 				old[j] = cents[j];
// 			}
// 		} else {
// 			for (let j = 0; j < k; j++) {
// 				sum[j] = [0];
// 				// sum[j] = 0;
// 				old[j] = cents[j];
// 			}
// 		}
// 		// console.log("sum " + sum);

// 		// If multidimensional
// 		if (data[0].length > 0) {
// 			for (let j = 0; j < k; j++) {
// 				cents[j] = cents[j].splice(0, cents[j].length);
// 			}

// 			// Sum values and count for each centroid
// 			for (const i in data) {
// 				let idx: number = indexes[i]; // Centroid for that item
// 				// let v_sum: number = sum[idx]; // Sum values for this centroid
// 				let v_sum: number = sum[idx]; // Sum values for this centroid
// 				let vector: Vector = data[i]; // Current vector

// 				// Accumulate value on the centroid for current vector
// 				for (let h = 0; h < data[0].length; h++) {
// 					v_sum[h] += vector[h];
// 				}
// 			}
// 			// Calculate the average for each centroid
// 			cent_moved = true;
// 			for (let j = 0; j < k; j++) {
// 				let cents_j: Centroids = cents[j]; // Current centroid
// 				/* sum[j] |  Accumulated centroid values
// 				old[j] | Old centroid value
// 				count[j] | Number of elements for this centroid
// 				New average */
// 				for (let h = 0; h < data[0].length; h++) {
// 					cents_j[h] = sum[j][h] / count[j] || 0; // New centroid
// 				}

// 				// Find if centroids have moved
// 				if (cent_moved) {
// 					for (let h = 0; h < data[0].length; h++) {
// 						if (old[j][h] != cents_j[h]) {
// 							cent_moved = false;
// 							break;
// 						}
// 					}
// 				}
// 			}
// 		}
// 		// If unidimensional
// 		else {
// 			// Sum values and count for each centroid
// 			for (const i in data) {
// 				let idx = indexes[i];
// 				sum[idx] += data[i];
// 			}

// 			let avg_cents: Centroids = Array(cents.length).fill(0);
// 			// Calculate the average for each centroid
// 			for (let j = 0; j < k; j++) {
// 				avg_cents[j] = sum[j] / count[j] || 0; // New centroid
// 			}
// 			// Find if centroids have moved
// 			cent_moved = true;
// 			for (let j = 0; j < k; j++) {
// 				if (old[j] != cents[j]) {
// 					cent_moved = false;
// 					break;
// 				}
// 			}
// 		}

// 		cent_moved = cent_moved || --iterations <= 0;
// 	} while (!cent_moved);

// 	let k_means: KMeans = {
// 		it: (max_it || MAX) - iterations,
// 		k: k,
// 		indexes: indexes,
// 		centroids: cents
// 		// test: test
// 	};
// 	return k_means;
// }

// // module.exports = kmeans;
// // // exports.kmeans = kmeans;
// // export { kmeans as KMEANS };
// // export default kmeans;
// // export default module.exports = {
// // 	KMEANS: kmeans
// // };
// module.exports = kmeans;

// // function test(point: number, fn_dist: Function) {
// // 	// const centroids: Array<Centroids> = this.centroids;
// // 	const centroids = this.centroids;
// // 	// For each value in data, find the nearest centroid
// // 	let min: number = Infinity;
// // 	let idx: number = 0;
// // 	for (const j in centroids) {
// // 		// Custom, Multidimensional or unidimensional
// // 		let dist = fn_dist
// // 			? fn_dist(point, centroids[j])
// // 			: Array.isArray(point)
// // 				? Distance.euclideanDist(point, centroids[j])
// // 				: Math.abs(point - centroids[j]);

// // 		if (dist <= min) {
// // 			min = dist;
// // 			idx = parseInt(j);
// // 		}
// // 	}
// // 	return {
// // 		idx,
// // 		centroid: centroids[idx]
// // 	};
// // }

// class Cluster {
// 	// K-means initial centroid selection
// 	static k_means(data: Array<Vector>, k: number): Array<Array<number>> {
// 		let map: Map<String, boolean>;
// 		let cents: Array<Array<number>> = [];
// 		let t: number = k << 2;
// 		while (cents.length < k && t-- > 0) {
// 			let d: Array<number> = data[Math.floor(Math.random() * data.length)];
// 			let key: string = data[0].length > 0 ? d.join("_") : `${d}`;
// 			if (!map[key]) {
// 				map[key] = true;
// 				cents.push(d);
// 			}
// 		}
// 		if (cents.length < k) throw Error("Error initializing clusters");
// 		else return cents;
// 	}

// 	// K-means++ initial centroid selection
// 	static k_means_pp(
// 		data: Array<Array<number>>,
// 		k: number,
// 		fn_dist?: Function
// 	): Array<Array<number>> {
// 		const distance =
// 			fn_dist || (data[0].length ? Distance.euclideanDist : Distance.dist);
// 		let cents: Array<Array<number>> = [];
// 		let map = {};
// 		// Initial random centroid
// 		let c: Array<number> = data[Math.floor(Math.random() * data.length)];
// 		let key: string = data[0].length > 0 ? c.join("_") : `${c}`;
// 		cents.push(c);
// 		map[key] = true;
// 		// Get next centroids
// 		while (cents.length < k) {
// 			// Find min distances between current centroids and data points
// 			let distances: Array<number> = [];
// 			let prs: Array<{
// 				i: string;
// 				v: Vector;
// 				pr: number;
// 				cs: number;
// 			}> = [];
// 			let d_sum: number = 0;
// 			for (const i in data) {
// 				let min: number = Infinity;
// 				for (const j in cents) {
// 					let dist: number = distance(data[i], cents[j]);
// 					if (dist <= min) min = dist;
// 				}
// 				distances[i] = min;
// 			}
// 			// Sum min distances
// 			for (const i in data) {
// 				d_sum += distances[i];
// 			}
// 			// Probabilities and cumulative prob
// 			for (const i in data) {
// 				prs[i] = { i: i, v: data[i], pr: distances[i] / d_sum, cs: 0 };
// 			}
// 			// Sort Probabilities
// 			prs.sort((a, b) => a.pr - b.pr);
// 			// Cumulative Probabilities
// 			prs[0].cs = prs[0].pr;
// 			for (let i = 1; i < data.length; i++) {
// 				prs[i].cs = prs[i - 1].cs + prs[i].pr;
// 			}
// 			// Gets items where cum sum >= random num
// 			let rnd: number = Math.random();
// 			let idx: number = 0;
// 			while (idx < data.length - 1 && prs[idx++].cs < rnd);
// 			cents.push(prs[idx - 1].v);
// 		}
// 		return cents;
// 	}
// }

// export type Point = Array<number>;

// class Distance {
// 	// ed((x1, y1), (x2, y2)) = || (x1, y1) – (x2, y2) ||
// 	static euclideanDist(x: Point, y: Point): number {
// 		let sum: number = 0;
// 		for (const i in x) {
// 			const d: number = (x[i] || 0) - (y[i] || 0);
// 			sum += d * d;
// 		}
// 		return sum;
// 	}

// 	// md((x1, y1), (x2, y2)) = | x1 – x2 | + | y1 – y2 |
// 	static manhattanDist(x: Point, y: Point): number {
// 		let sum: number = 0;
// 		let d: number = 0;
// 		for (const i in x) {
// 			d = (x[i] || 0) - (y[i] || 0);
// 			sum += d >= 0 ? d : -d;
// 		}
// 		return sum;
// 	}

// 	// d(x, y, z) = z ? || x - y || : || x - y || * || x - y ||
// 	static dist(x: number, y: number, sqrt?: number): number {
// 		const d: number = Math.abs(x - y);
// 		return sqrt ? d : d * d;
// 	}
// }
