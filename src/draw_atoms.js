import * as THREE from 'three';
import { covalentRadii, elementColors } from './atoms_data.js';

const defaultColor = 0xffffff;


export function drawAtoms(scene, atoms, scaleAtom, vizTypes) {
    let scale = 1;
    // Create a basic sphere geometry for all atoms
    const atomGeometry = new THREE.SphereGeometry(1, 32, 32); // Unit sphere
    const material = new THREE.MeshPhongMaterial({
        color: defaultColor,
        specular: 0x222222,
        shininess: 100,
        reflectivity: 0.9, // Reflectivity strength for the environment map
    });

    // Create a single instanced mesh for all atoms
    const instancedMesh = new THREE.InstancedMesh(atomGeometry, material, atoms.speciesArray.length);

    // Position, scale, and color each atom
    atoms.speciesArray.forEach((symbol, globalIndex) => {
        const radius = covalentRadii[symbol] || 1;
        const color = new THREE.Color(elementColors[symbol] || defaultColor);

        // Set position and scale
        const position = new THREE.Vector3(...atoms.positions[globalIndex]);
        const dummy = new THREE.Object3D();
        dummy.position.copy(position);
        if (vizTypes[globalIndex] === 0) {
            scale = scaleAtom*1;
        } else if (vizTypes[globalIndex] === 1) {
            scale = scaleAtom*0.6;
        } else if (vizTypes[globalIndex] === 2) {
            scale = scaleAtom*0.6;
        } else if (vizTypes[globalIndex] === 3) {
            scale = scaleAtom*0;
        }
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
