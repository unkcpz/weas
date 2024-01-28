import * as THREE from 'three';
import {createLabel} from './draw_label.js';


export function drawUnitCell(scene, atoms) {
    const cell = atoms.cell;
    if (!cell || cell.length !== 3 ) {
        console.warn("Invalid or missing unit cell data");
        return;
    }

    const cellMatrix = cell;

    const material = new THREE.LineBasicMaterial({ color: 0x00ff00 });
    const points = [];

    // Origin
    const origin = new THREE.Vector3(0, 0, 0);

    // Cell vertices
    const v0 = origin;
    const v1 = new THREE.Vector3(...cellMatrix[0]);
    const v2 = new THREE.Vector3(...cellMatrix[1]);
    const v3 = new THREE.Vector3().addVectors(v1, v2);
    const v4 = new THREE.Vector3(...cellMatrix[2]);
    const v5 = new THREE.Vector3().addVectors(v1, v4);
    const v6 = new THREE.Vector3().addVectors(v2, v4);
    const v7 = new THREE.Vector3().addVectors(v3, v4);

    // Lines
    // Base
    points.push(v0.clone(), v1.clone(), v1.clone(), v3.clone(), v3.clone(), v2.clone(), v2.clone(), v0.clone());
    // Top
    points.push(v4.clone(), v5.clone(), v5.clone(), v7.clone(), v7.clone(), v6.clone(), v6.clone(), v4.clone());
    // Sides
    points.push(v0.clone(), v4.clone(), v1.clone(), v5.clone(), v2.clone(), v6.clone(), v3.clone(), v7.clone());

    const geometry = new THREE.BufferGeometry().setFromPoints(points);
    const line = new THREE.LineSegments(geometry, material);
    line.userData.type = 'cell';
    line.userData.uuid = atoms.uuid;
    scene.add(line);
}



export function drawUnitCellVectors(scene, cell) {
    if (!cell || cell.length !== 3) {
        console.warn("Invalid or missing unit cell data for vectors");
        return;
    }

    // Define lengths and colors for the vectors
    const arrowLength = 1;
    const colors = { a: 0xff0000, b: 0x00ff00, c: 0x0000ff }; // Red, Green, Blue

    // Create arrows
    const aArrow = new THREE.ArrowHelper(new THREE.Vector3(...cell.slice(0, 3)).normalize(), new THREE.Vector3(0, 0, 0), arrowLength, colors.a);
    const bArrow = new THREE.ArrowHelper(new THREE.Vector3(...cell.slice(3, 6)).normalize(), new THREE.Vector3(0, 0, 0), arrowLength, colors.b);
    const cArrow = new THREE.ArrowHelper(new THREE.Vector3(...cell.slice(6, 9)).normalize(), new THREE.Vector3(0, 0, 0), arrowLength, colors.c);

    // Add arrows to the scene
    scene.add(aArrow);
    scene.add(bArrow);
    scene.add(cArrow);

    // Add labels for each axis
    const offset = 1.1; // Adjust this to position the labels
    const aLabel = createLabel('a', new THREE.Vector3(...cell[0]).normalize().multiplyScalar(offset), 'red', "18px");
    const bLabel = createLabel('b', new THREE.Vector3(...cell[1]).normalize().multiplyScalar(offset), 'green', "18px");
    const cLabel = createLabel('c', new THREE.Vector3(...cell[2]).normalize().multiplyScalar(offset), 'blue', "18px");

    scene.add(aLabel);
    scene.add(bLabel);
    scene.add(cLabel);
}
