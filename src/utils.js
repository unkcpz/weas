import * as THREE from 'three';
import {covalentRadii } from './atoms_data.js';
import { kdTree } from './kdTree.js';

export function findNeighbors(atoms, indices=null) {
    
    if (indices === null) {
        indices = [...Array(atoms.positions.length).keys()];
    }

    // Initialize neighbors array
    const neighbors = new Array(atoms.positions.length).fill(null).map(() => []);

    // Create k-d tree from atom positions
    var distance = function(a, b){
        return Math.pow(a.x - b.x, 2) +  Math.pow(a.y - b.y, 2) +  Math.pow(a.z - b.z, 2);
      }

    const positions = atoms.positions.map((pos, index) => ({
        x: pos[0], 
        y: pos[1], 
        z: pos[2], 
        index: index,
    }));
    const tree = new kdTree(positions, distance, ['x', 'y', 'z']);

    // Iterate over each atom
    indices.forEach(index1 => {
        const species1 = atoms.species[atoms.speciesArray[index1]].symbol;
        const radius1 = covalentRadii[species1] * 1.1 || 1;
        const pos1 = atoms.positions[index1];
        const point = {x: atoms.positions[index1][0], y: atoms.positions[index1][1], z: atoms.positions[index1][2]};
        // Find potential neighbors within the sum of radius1 and maximum possible radius2
        // Extract the species symbols (keys)
        const speciesKeys = Object.keys(atoms.species);
        // Map the species to their radii
        const speciesRadii = speciesKeys.map(key => covalentRadii[atoms.species[key][0]]);
        const maxRadius2 = Math.max(...Object.values(speciesRadii)) * 1.1 || 1;
        // max neighbors is 12, which is the number of nearest neighbors in a face-centered cubic lattice
        // the closest packed structure
        const potentialNeighbors = tree.nearest(point, 12, (radius1+maxRadius2) ** 2);

        potentialNeighbors.forEach(neighbor => {
            const index2 = neighbor[0].index;
            if (index1 >= index2) return;

            const species2 = atoms.species[atoms.speciesArray[index2]].symbol;
            const radius2 = covalentRadii[species2] * 1.1 || 1;
            const pos2 = atoms.positions[index2];

            const distance = calculateDistance(pos1, pos2);
            if (distance < radius1 + radius2) {
                neighbors[index1].push(index2);
                neighbors[index2].push(index1);
            }
        });
    });

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
