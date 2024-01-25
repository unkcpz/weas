import * as THREE from 'three';
import {elementColors } from './atoms_data.js';
import {findNeighbors } from './utils.js';


const defaultColor = 0xffffff;


export function drawBonds(scene, atoms, radius=0.10, vizTypes, colorType="CPK") {
    const bonds = calculateBonds(atoms, vizTypes);

    console.time("drawBonds Time");

    const cylinderGeometry = new THREE.CylinderGeometry(1, 1, 1, 8, 1); // Adjust segment count as needed

    const instanceMatrix = new THREE.Matrix4();

    // Creating two instanced meshes, one for each color in the bond
    const material = new THREE.MeshPhongMaterial({
        color: defaultColor,
        specular: 0x222222,
        shininess: 100,
        reflectivity: 0.9, // Reflectivity strength for the environment map
    });

    const instancedMesh = new THREE.InstancedMesh(cylinderGeometry, material, bonds.length*2);

    bonds.forEach(([index1, index2], instanceId) => {
        const position1 = new THREE.Vector3(...atoms.positions[index1]);
        const position2 = new THREE.Vector3(...atoms.positions[index2]);

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



export function calculateBonds(atoms, vizTypes) {
    // indices is all atoms with vizType != 0
    const indices = [];
    for (let i = 0; i < vizTypes.length; i++) {
        if (vizTypes[i] !== 0) {
            indices.push(i);
        }
    }

    // Start timer for findNeighbors
    console.time("findNeighbors Time");
    const neighbors = findNeighbors(atoms, indices);
    // End timer for findNeighbors
    console.timeEnd("findNeighbors Time");
    // Start timer for buildBonds
    console.time("buildBonds Time");
    const bondsData = buildBonds(neighbors);
    // End timer for buildBonds
    console.timeEnd("buildBonds Time");

    return bondsData;
}


export function buildBonds(neighbors) {
    const bonds = [];

    for (let i = 0; i < neighbors.length; i++) {
        for (const neighborIndex of neighbors[i]) {
            if (neighborIndex > i) {
                bonds.push([i, neighborIndex]); // Add a bond between atom i and its neighbor
            }
        }
    }

    return bonds;
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

