import * as THREE from 'three';
import { covalentRadii, elementColors } from './atoms_data.js';
import { materials } from './materials.js';

const defaultColor = 0xffffff;


export function drawAtoms(scene, atoms, scaleAtom, models, colorType="CPK",
                          materialType="standard") {
    let scale = 1;
    // Create a basic sphere geometry for all atoms
    let radiusSegment = 32;
    // change radiusSegment based on number of atoms
    if (atoms.speciesArray.length > 100000) {
        radiusSegment = 12;
    } else if (atoms.speciesArray.length > 10000) {
        radiusSegment = 18;
    } else if (atoms.speciesArray.length > 1000) {
        radiusSegment = 24;
    } else if (atoms.speciesArray.length > 100) {
        radiusSegment = 32;
    } else {
        radiusSegment = 32;
    }
    const atomGeometry = new THREE.SphereGeometry(1, radiusSegment, radiusSegment); // Unit sphere
    const material = materials[materialType].clone()
    // Create a single instanced mesh for all atoms
    const instancedMesh = new THREE.InstancedMesh(atomGeometry, material, atoms.speciesArray.length);
    // Position, scale, and color each atom
    atoms.speciesArray.forEach((symbol, globalIndex) => {
        // if models[globalIndex] is 0, skip
        if (models["indices"][globalIndex] === 0) {
            return;
        }
        const radius = covalentRadii[symbol] || 1;
        const color = new THREE.Color(elementColors[colorType][symbol] || defaultColor);

        // Set position and scale
        const position = new THREE.Vector3(...atoms.positions[globalIndex]);
        const dummy = new THREE.Object3D();
        dummy.position.copy(position);
        const scale = models["scales"][globalIndex];
        dummy.scale.set(radius * scale, radius * scale, radius * scale);
        dummy.updateMatrix();
        instancedMesh.setMatrixAt(globalIndex, dummy.matrix);
        // Set color
        instancedMesh.setColorAt(globalIndex, color);
    });
    instancedMesh.userData.type = 'atom';
    instancedMesh.userData.uuid = atoms.uuid;

    // Update instance
    instancedMesh.instanceMatrix.needsUpdate = true
    instancedMesh.instanceColor.needsUpdate = true;

    scene.add(instancedMesh);
    return instancedMesh;
}
