import * as THREE from 'three';
import {elementColors } from './atoms_data.js';
import {findNeighbors, multiplyMatrixVector } from './utils.js';
import { materials } from './materials.js';


const defaultColor = 0xffffff;


export function drawBonds(scene, atoms, bondList, radius=0.10, colorType="CPK",
                          materialType="standard") {

    console.time("drawBonds Time");

    const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 8, 1); // Adjust segment count as needed

    const instanceMatrix = new THREE.Matrix4();

    const material = materials[materialType].clone();
    const instancedMesh = new THREE.InstancedMesh(cylinderGeometry, material, bondList.length*2);

    bondList.forEach(([index1, index2, offset1, offset2], instanceId) => {
        // console.log(index1, index2, offset1, offset2);
        var position1 = atoms.positions[index1].map((value, index) => value + multiplyMatrixVector(atoms.cell, offset1)[index]);
        position1 = new THREE.Vector3(...position1);
        // update position2 to include offset, dot product with cell
        var position2 = atoms.positions[index2].map((value, index) => value + multiplyMatrixVector(atoms.cell, offset2)[index]);
        position2 = new THREE.Vector3(...position2)

        // Setting color for each material
        const color1 = new THREE.Color(elementColors[colorType][atoms.species[atoms.speciesArray[index1]].symbol]);
        const color2 = new THREE.Color(elementColors[colorType][atoms.species[atoms.speciesArray[index2]].symbol]);

        // Calculate transformation for the cylinder
        const midpoint = new THREE.Vector3().lerpVectors(position1, position2, 0.5);
        const midpoint1 = new THREE.Vector3().lerpVectors(position1, midpoint, 0.5);
        const midpoint2 = new THREE.Vector3().lerpVectors(midpoint, position2, 0.5);
        const orientation = new THREE.Matrix4().lookAt(position1, position2, new THREE.Object3D().up);
        const quaternion = new THREE.Quaternion().setFromRotationMatrix(orientation);

        // Adjusting rotation to align with the bond direction
        const adjustmentQuaternion = new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(1, 0, 0), Math.PI / 2);
        quaternion.multiply(adjustmentQuaternion);

        const scale = new THREE.Vector3(radius, position1.distanceTo(position2) / 2, radius);
        // Apply transformation to each instance
        instanceMatrix.compose(midpoint1, quaternion, scale);
        instancedMesh.setMatrixAt(2*instanceId, instanceMatrix);
        instancedMesh.setColorAt(2*instanceId, color1);
        //
        instanceMatrix.compose(midpoint2, quaternion, scale);
        instancedMesh.setMatrixAt(2*instanceId+1, instanceMatrix);
        instancedMesh.setColorAt(2*instanceId+1, color2);
    });

    instancedMesh.userData.type = 'bond';
    instancedMesh.userData.uuid = atoms.uuid;

    scene.add(instancedMesh);
    console.timeEnd("drawBonds Time");
}


export function calculateBonds(atoms, offsets) {
    // Start timer for findNeighbors
    console.time("findNeighbors Time");
    const neighbors = findNeighbors(atoms, offsets);
    // End timer for findNeighbors
    console.timeEnd("findNeighbors Time");

    return neighbors;
}


export function createSingleBondSegment(start, end, radius, material) {
    const direction = new THREE.Vector3().subVectors(end, start);
    const orientation = new THREE.Matrix4();
    orientation.lookAt(start, end, new THREE.Object3D().up);

    const edgeGeometry = new THREE.CylinderGeometry(radius, radius, direction.length(), 8, 1);
    const edge = new THREE.Mesh(edgeGeometry, material);
    edge.position.copy(new THREE.Vector3().addVectors(start, direction.multiplyScalar(0.5)));

    const axis = new THREE.Vector3(0, 1, 0).cross(direction).normalize();
    const radians = Math.acos(new THREE.Vector3(0, 1, 0).dot(direction.normalize()));
    edge.quaternion.setFromAxisAngle(axis, radians);

    return edge;
}


export function createCylinderBetweenPoints(point1, point2, radius, material, material2) {
    const midpoint = new THREE.Vector3().addVectors(point1, point2).multiplyScalar(0.5);
    const cylinder1 = createSingleBondSegment(point1, midpoint, radius, material);
    const cylinder2 = createSingleBondSegment(midpoint, point2, radius, material2);

    const bondGroup = new THREE.Group();
    bondGroup.add(cylinder1);
    bondGroup.add(cylinder2);

    return bondGroup;
}

