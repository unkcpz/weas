import * as THREE from 'three';
import {covalentRadii } from './atoms_data.js';
import { kdTree } from './geometry/kdTree.js';

export function findNeighbors(atoms, offsets = null) {
    
    // If offsets is null, initialize it to include all atoms with zero offset
    if (offsets === null) {
        offsets = atoms.positions.map((_, index) => [index, [0, 0, 0]]);
    }

    // Initialize neighbors array based on offsets length
    const neighbors = [];

    // Function to calculate distance
    var distance = function(a, b){
        return Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2) +  Math.pow(a.z - b.z, 2);
    };

    // Calculate positions with offsets
    const positions = offsets.map(offset => {
        const originalPos = atoms.positions[offset[0]];
        const shift = multiplyMatrixVector(atoms.cell, offset[1]);
    
        return [
            originalPos[0] + shift[0],
            originalPos[1] + shift[1],
            originalPos[2] + shift[2],
        ];
    });
    // Create k-d tree from adjusted positions
    const points = positions.map((position, index) => {
        return {
            x: position[0], 
            y: position[1], 
            z: position[2], 
            index: index
        };
    });
    const tree = new kdTree(points, distance, ['x', 'y', 'z']);
    // Extract the species symbols (keys)
    // Map the species to their radii
    // fin maximum possible radius2
    const speciesKeys = Object.keys(atoms.species);
    const speciesRadii = speciesKeys.map(key => covalentRadii[atoms.species[key][0]]);
    const maxRadius2 = Math.max(...Object.values(speciesRadii)) * 1.1 || 1;
    // Iterate over each atom with offset
    offsets.forEach(([atomIndex1, offset1], idx1) => {
        const species1 = atoms.species[atoms.speciesArray[atomIndex1]].symbol;
        const radius1 = covalentRadii[species1] * 1.1 || 1;
        const pos1 = positions[idx1];
        const point = {x: positions[idx1][0], y: positions[idx1][1], z: positions[idx1][2]};

        // Find potential neighbors within the sum of radius1 and maximum possible radius2
        // max neighbors is 12, which is the number of nearest neighbors in a face-centered cubic lattice
        // the closest packed structure
        const potentialNeighbors = tree.nearest(point, 12, (radius1+maxRadius2) ** 2);
        // console.log("potentialNeighbors: ", potentialNeighbors)

        potentialNeighbors.forEach(neighbor => {
            const idx2 = neighbor[0].index;
            if (idx1 == idx2) return;
            const atomIndex2 = offsets[idx2][0];
            const species2 = atoms.species[atoms.speciesArray[atomIndex2]].symbol;
            const radius2 = covalentRadii[species2] * 1.1 || 1;
            const pos2 = positions[idx2];
            

            const distance = calculateDistance(pos1, pos2);
            if (distance < radius1 + radius2) {
                neighbors.push([atomIndex1, atomIndex2, offset1, offsets[idx2][1]]);
            }
        });
    });
    // console.log("neighbors: ", neighbors)

    return neighbors;
}

// Helper function to calculate distance between two points
function calculateDistance(point1, point2) {
    return Math.sqrt(
        Math.pow(point1[0] - point2[0], 2) +
        Math.pow(point1[1] - point2[1], 2) +
        Math.pow(point1[2] - point2[2], 2)
    );
}

export function clearObjects(scene, uuid=null) {
    // Clone the children array since we'll be modifying it as we go
    const children = [...scene.children];

    children.forEach(child => {
        // If uuid is specified, only remove objects with matching uuid
        if (uuid !== null && (!child.userData || child.userData.uuid !== uuid)) {
            return; // Skip this object
        }

        // Check if the object is not a camera or a light
        if (!(child instanceof THREE.Camera) && !(child instanceof THREE.Light)) {
            scene.remove(child);

            // Dispose geometry and material if they exist
            if (child.geometry) {
                child.geometry.dispose();
            }
            if (child.material) {
                if (Array.isArray(child.material)) {
                    child.material.forEach(material => material.dispose());
                } else {
                    child.material.dispose();
                }
            }
        }
    });
}


export function createHighlight(position, scale) {
    const highlightGeometry = new THREE.SphereGeometry(1, 32, 32); // Unit sphere
    const highlightMaterial = new THREE.MeshBasicMaterial({
        color: new THREE.Color(0xffff00), // Yellow color
        transparent: true, // Make it transparent
        opacity: 0.5, // Set the transparency level (0.0 to 1.0)
    });
    const scaleMultiplier = 1.4; // Adjust the scale factor as needed (1.1 makes it slightly larger)
    const highlightedAtomMesh = new THREE.Mesh(highlightGeometry, highlightMaterial);
    highlightedAtomMesh.position.copy(position)
    // Scale the highlighted atom mesh
    highlightedAtomMesh.scale.set(
        scale.x * scaleMultiplier,
        scale.y * scaleMultiplier,
        scale.z * scaleMultiplier
    );
    return highlightedAtomMesh
}


export function getWorldPositionFromScreen(screenX, screenY, camera, plane) {
    const ndc = new THREE.Vector2(
        (screenX / window.innerWidth) * 2 - 1, 
        -(screenY / window.innerHeight) * 2 + 1
    );

    const raycaster = new THREE.Raycaster();
    raycaster.setFromCamera(ndc, camera);

    const worldPosition = new THREE.Vector3();
    raycaster.ray.intersectPlane(plane, worldPosition);
    return worldPosition;
}

export function convertToMatrixFromABCAlphaBetaGamma(abcAlphaBetaGamma) {
    const [a, b, c, alpha, beta, gamma] = abcAlphaBetaGamma;
    // Convert angles to radians
    const alphaRad = (alpha * Math.PI) / 180;
    const betaRad = (beta * Math.PI) / 180;
    const gammaRad = (gamma * Math.PI) / 180;

    // Calculate components of the cell matrix
    // Assuming orthorhombic cell (right angles) for simplicity
    // For triclinic or other cell types, the calculation will be more complex
    const ax = a;
    const ay = 0;
    const az = 0;
    const bx = b * Math.cos(gammaRad);
    const by = b * Math.sin(gammaRad);
    const bz = 0;
    const cx = c * Math.cos(betaRad);
    const cy = c * (Math.cos(alphaRad) - Math.cos(betaRad) * Math.cos(gammaRad)) / Math.sin(gammaRad);
    const cz = Math.sqrt(c * c - cx * cx - cy * cy);

    return [[ax, ay, az], [bx, by, bz], [cx, cy, cz]];
}


export function multiplyMatrixVector(matrix, vector) {
    const result = [];
    for (let i = 0; i < matrix.length; i++) {
        let sum = 0;
        for (let j = 0; j < matrix[i].length; j++) {
            sum += matrix[i][j] * vector[j];
        }
        result.push(sum);
    }
    return result;
}

// Function to calculate the inverse of a 3x3 matrix
export function calculateInverseMatrix(matrix) {
    const det = matrix[0][0] * (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1])
              - matrix[0][1] * (matrix[1][0] * matrix[2][2] - matrix[1][2] * matrix[2][0])
              + matrix[0][2] * (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]);

    if (det === 0) {
        throw new Error("Matrix has zero determinant, cannot calculate inverse.");
    }

    const invDet = 1 / det;
    const inverseMatrix = [
        [
            (matrix[1][1] * matrix[2][2] - matrix[1][2] * matrix[2][1]) * invDet,
            (matrix[0][2] * matrix[2][1] - matrix[0][1] * matrix[2][2]) * invDet,
            (matrix[0][1] * matrix[1][2] - matrix[0][2] * matrix[1][1]) * invDet
        ],
        [
            (matrix[1][2] * matrix[2][0] - matrix[1][0] * matrix[2][2]) * invDet,
            (matrix[0][0] * matrix[2][2] - matrix[0][2] * matrix[2][0]) * invDet,
            (matrix[0][2] * matrix[1][0] - matrix[0][0] * matrix[1][2]) * invDet
        ],
        [
            (matrix[1][0] * matrix[2][1] - matrix[1][1] * matrix[2][0]) * invDet,
            (matrix[0][1] * matrix[2][0] - matrix[0][0] * matrix[2][1]) * invDet,
            (matrix[0][0] * matrix[1][1] - matrix[0][1] * matrix[1][0]) * invDet
        ]
    ];

    return inverseMatrix;
}