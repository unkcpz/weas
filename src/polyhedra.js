import * as THREE from 'three';
import { ConvexGeometry } from 'three/examples/jsm/geometries/ConvexGeometry.js';
import { elementColors } from './atoms_data.js';
import { multiplyMatrixVector } from './utils.js';
import { materials } from './materials.js';

const defaultColor = 0xffffff;

export function drawPolyhedra(scene, atoms, polyhedras, colorType="CPK", materialType="standard") {

    for (const polyhedra of polyhedras) {
        const vertices = [];

        // Assuming neighbors.length is the number of vertices
        for (const neighbor of polyhedra.neighbors) {
        var position = atoms.positions[neighbor[0]].map((value, index) => value + multiplyMatrixVector(atoms.cell, neighbor[1])[index]);
        const vertex = new THREE.Vector3(...position);
			vertices.push( vertex );
        }

        const geometry = new ConvexGeometry( vertices );
        const symbol = atoms.speciesArray[polyhedra.center[0]];
        const color = elementColors[colorType][symbol] || defaultColor;
        
        const material = materials[materialType].clone();
        material.color = new THREE.Color(color);
        material.transparent =true; // Enable transparency
        material.opacity=0.8;      // Set the opacity value (0.0 to 1.0, where 0.0 is fully transparent and 1.0 is fully opaque)
        
		const mesh = new THREE.Mesh( geometry, material );
        mesh.userData.type = 'polyhedra';
        mesh.userData.symbol = symbol;
        mesh.userData.uuid = atoms.uuid;
		scene.add( mesh );
    }
}


export function createBondMapping(bondList) {
    const bondMap = {};

    bondList.forEach((bond) => {
        // Add atomIndex2 to the bond list of bond[0]
        const key1 = bond[0] + "-" + bond[2].join('-');
        if (bondMap[key1]) {
            bondMap[key1]["neighbors"].push([bond[1], bond[3]]);
        } else {
            bondMap[key1] = {"center": [bond[0], bond[2]],
                             "neighbors": [[bond[1], bond[3]]]};
        }

        // Similarly, add bond[0] to the bond list of atomIndex2
        const key2 = bond[1] + "-" + bond[3].join('-');
        if (bondMap[key2]) {
            bondMap[key2]["neighbors"].push([bond[0], bond[2]]);
        } else {
            bondMap[key2] = {"center": [bond[1], bond[3]],
                             "neighbors": [[bond[0], bond[2]]]};
        }
    });

    return bondMap;
}

export function filterBondMap(bondMap, speciesArray, elements, models) {
    /*
    loop through bondMap and filter out only those atoms that have
    four or more neighbors and whose species (retrieved from atoms.speciesArray[atomIndex])
    are in a specified list of elements (elements)
    */
    const filteredMap = [];

    Object.keys(bondMap).forEach(key => {
        const atomIndex = bondMap[key]["center"][0];
        const numNeighbors = bondMap[key]["neighbors"].length;
        const speciesName = speciesArray[bondMap[key]["center"][0]];

        if (models["indices"][atomIndex] && numNeighbors >= 4 && elements.includes(speciesName)) {
            filteredMap.push(bondMap[key]);
        }
    });

    return filteredMap;
}