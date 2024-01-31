import * as THREE from 'three';
import { getWorldPositionFromScreen } from './utils.js';
import {SelectionBox } from 'three/examples/jsm/interactive/SelectionBox.js';
import {SelectionHelper } from 'three/examples/jsm/interactive/SelectionHelper.js';

class EventHandlers {
    constructor(viewer) {
        this.viewer = viewer;
        this.tjs = viewer.tjs;
        this.init();
        this.setupEventListeners();
    }

    init() {
        // Add mouse state tracking
        this.isMouseDown = false;
        this.mouseDownPosition = new THREE.Vector2();
        this.mouseUpPosition = new THREE.Vector2();
        this.mousePosition = new THREE.Vector2();
        this.initialAtomPositions = new Map(); // To store initial positions of selected atoms
        this.transformMode = null; // 'move' or 'rotate'
        this.boxselect = false;
        this.dragMode = null; // 'move' or 'rotate'
		this.selectionBox = new SelectionBox(this.tjs.camera, this.tjs.scene );
		this.helper = new SelectionHelper(this.tjs.renderers["MainRenderer"].renderer, 'selectBox' );
        }

    setupEventListeners() {
        const container = this.viewer.tjs.containerElement;

        container.addEventListener('pointerdown', this.onMouseDown.bind(this), false);
        container.addEventListener('pointerup', this.onMouseUp.bind(this), false);
        container.addEventListener('click', this.onMouseClick.bind(this), false);
        container.addEventListener('mousemove', this.onMouseMove.bind(this), false);
        container.setAttribute('tabindex', '0'); // '0' means it can be focused
        container.addEventListener('keydown', this.onKeyDown.bind(this), false);
    }

    onMouseDown(event) {
        // Implement the logic for mouse down events
        this.isMouseDown = true;
        this.mouseDownPosition.set(event.clientX, event.clientY);
        const viewerRect = this.tjs.containerElement.getBoundingClientRect();
        let x = ((event.clientX - viewerRect.left) / viewerRect.width) * 2 - 1;
        let y = -((event.clientY - viewerRect.top) / viewerRect.height) * 2 + 1;
        this.selectionBox.startPoint.set(x, y, 0.5 );
        this.oldSelectedAtomsIndices = this.viewer.selectedAtomsIndices;
        // Calculate mouse position in normalized device coordinates

    }

    onMouseUp(event) {
        // Implement the logic for mouse up events
        this.isMouseDown = false;
        this.mouseUpPosition.set(event.clientX, event.clientY);
        const viewerRect = this.tjs.containerElement.getBoundingClientRect();
        let x = ((event.clientX - viewerRect.left) / viewerRect.width) * 2 - 1;
        let y = -((event.clientY - viewerRect.top) / viewerRect.height) * 2 + 1;
        this.selectionBox.startPoint.set(x, y, 0.5 );
    }

    onMouseMove(event) {
        // Implement the logic for mouse move events
        this.mousePosition.set(event.clientX, event.clientY);
        if (this.transformMode === 'move') {
            this.moveSelectedAtoms(event);
        } else if (this.transformMode === 'rotate') {
            this.rotateSelectedAtoms(event);
        } else if (this.isMouseDown  && event.shiftKey) {
            this.boxselect = true;
            const viewerRect = this.tjs.containerElement.getBoundingClientRect();
            let x = ((event.clientX - viewerRect.left) / viewerRect.width) * 2 - 1;
            let y = -((event.clientY - viewerRect.top) / viewerRect.height) * 2 + 1;
            this.selectionBox.endPoint.set(
                x, y,
                0.5 );
            
            this.selectionBox.select();
            // add the selected atoms to the selectedAtoms set
            const selectedAtomsIndicesFromBox = new Set(this.selectionBox.instances[this.viewer.atomsMesh.uuid]);
            this.viewer.selectedAtomsIndices = new Set([...this.oldSelectedAtomsIndices, ...selectedAtomsIndicesFromBox]);
            this.viewer.drawHighlightAtoms();
        }
    }

    onKeyDown(event) {
        // Implement the logic for key down events
        switch (event.key) {
            case 'Delete':
                this.viewer.deleteSelectedAtoms();
                this.dispatchAtomsUpdated();
                break;
            case 'Escape':
                this.exitTransformMode();
                break;
            case 'g':
                this.enterTransformMode('move', event);
                this.dispatchAtomsUpdated();
                break;
            case 'r':
                this.enterTransformMode('rotate', event);
                this.dispatchAtomsUpdated();
                break;
            case '1':
                this.viewer.tjs.camera.position.set(0, 0, 100); // Example positions
                this.viewer.tjs.camera.lookAt(0, 0, 0);
                break;
            case '2':
                this.viewer.tjs.camera.position.set(-100, 0, 0); // Example positions
                this.viewer.tjs.camera.lookAt(0, 0, 0);
                break;
            case '3':
                this.viewer.tjs.camera.position.set(0, 100, 0); // Example positions
                this.viewer.tjs.camera.lookAt(0, 0, 0);
                break
        }
    }

    onMouseClick(event) {
        // Handle mouse click to exit the current transform mode.
        if (this.transformMode) {
            this.transformMode = null;
            this.initialAtomPositions.clear();
            // TODO: This is a temporary solution to fix the issue of intersection not working after moving atoms
            // after moving the atoms, the intersection does not work anymore
            // redraw the model to make it work
            // this is a temporary solution
            // it can also update the bonds, etc
            this.viewer.drawModels();
            this.dispatchAtomsUpdated();
            return;
        }
        // Calculate the distance the mouse moved
        const dx = event.clientX - this.mouseDownPosition.x;
        const dy = event.clientY - this.mouseDownPosition.y;
        const distanceMoved = Math.sqrt(dx * dx + dy * dy);

        // Check if the mouse was dragged (customize the threshold as needed)
        if (distanceMoved > 5) {
            return; // Ignore clicks that involve dragging
        }
        this.pickAtoms(event);
    }

    pickAtoms(event) {
        console.log("Pick atoms");
        const raycaster = new THREE.Raycaster();
        const mouse = new THREE.Vector2();

        // Calculate mouse position in normalized device coordinates
        const viewerRect = this.tjs.containerElement.getBoundingClientRect();
        mouse.x = ((event.clientX - viewerRect.left) / viewerRect.width) * 2 - 1;
        mouse.y = -((event.clientY - viewerRect.top) / viewerRect.height) * 2 + 1;
        // Update the picking ray
        raycaster.setFromCamera(mouse, this.tjs.camera);

        // Check for intersections with atom mesh
        // Update the matrix for the instanced mesh
        this.viewer.atomsMesh.instanceMatrix.needsUpdate = true;

        // Optionally, update the matrixWorld if it's been changed
        this.viewer.atomsMesh.updateMatrixWorld();

        const intersects = raycaster.intersectObject(this.viewer.atomsMesh);
        // Check if there are intersections
        if (intersects.length > 0) {
            // Get the first intersected object (atom)
            const selectedObject = intersects[0].object;

            // Check if the selected object is an atom
            if (selectedObject.userData && selectedObject.userData.type === 'atom') {
                // Get the instance index of the selected atom
                const instanceIndex = intersects[0].instanceId;
                if (this.viewer.selectedAtomsIndices.has(instanceIndex)) {
                    // If the atom is already selected, unselect it
                    this.viewer.selectedAtomsIndices.delete(instanceIndex);
                } else {
                    // Add the instance index to the selectedAtoms set
                    this.viewer.selectedAtomsIndices.add(instanceIndex);
                    const symbol = this.viewer.atoms.species[this.viewer.atoms.speciesArray[instanceIndex]].symbol;
                    const position = new THREE.Vector3(...this.viewer.atoms.positions[instanceIndex]);
                    this.viewer.createAtomLabel(symbol, position, "black", "18px");
                }
                this.viewer.drawHighlightAtoms();
            } else {
                // Clear the HTML element when nothing is selected
                this.viewer.clearAtomLabel();
                this.viewer.selectedAtomsIndices.clear();
                this.viewer.clearHighlightAtoms();
            }
        } else {
            // Clear the HTML element when nothing is selected
            this.viewer.clearAtomLabel();
            this.viewer.selectedAtomsIndices.clear();
            this.viewer.clearHighlightAtoms();
        }
    }

    enterTransformMode(mode, event) {
        this.transformMode = mode;
        console.log("Enter transformMode: ", this.transformMode);
        this.initialMousePosition = this.mousePosition.clone();
        this.storeInitialAtomPositions();
    }

    exitTransformMode() {
        if (!this.transformMode) {
            return;
        }
        const mode = this.transformMode
        this.transformMode = null;
        console.log("Exit transformMode: ", mode);
        this.viewer.resetSelectedAtomsPositions(this.initialAtomPositions);
    }

    storeInitialAtomPositions() {
        this.viewer.selectedAtomsIndices.forEach((atomIndex) => {
            const matrix = new THREE.Matrix4();
            this.viewer.atomsMesh.getMatrixAt(atomIndex, matrix);
            const position = new THREE.Vector3();
            matrix.decompose(position, new THREE.Quaternion(), new THREE.Vector3());
            this.initialAtomPositions.set(atomIndex, position.clone());
        });
    }

    moveSelectedAtoms(event) {
        const movementPlane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
        // Get the camera's forward direction (negative z-axis in world space)
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(this.tjs.camera.quaternion);
        // Update the plane's normal
        movementPlane.normal.copy(cameraDirection);
        const currentWorldPosition = getWorldPositionFromScreen(event.clientX, event.clientY, this.tjs.camera, movementPlane);
        const initialWorldPosition = getWorldPositionFromScreen(this.initialMousePosition.x, this.initialMousePosition.y, this.tjs.camera, movementPlane);
        const movementVector = currentWorldPosition.sub(initialWorldPosition);
        // Apply movementVector to object
        this.viewer.moveSelectedAtoms(this.initialAtomPositions, movementVector);
        
    }

    rotateSelectedAtoms(event) {
        // Calculate the centroid of the selected atoms
        let centroid = new THREE.Vector3(0, 0, 0);
        this.viewer.selectedAtomsIndices.forEach((atomIndex) => {
            centroid.add(this.initialAtomPositions.get(atomIndex));
        });
        centroid.divideScalar(this.viewer.selectedAtomsIndices.size);

        // Project the centroid to 2D screen space
        const centroidScreen = centroid.clone().project(this.tjs.camera);

        // Calculate normalized device coordinates of centroid, initial, and new mouse positions
        const centroidNDC = new THREE.Vector2(centroidScreen.x, centroidScreen.y);
        
        const viewerRect = this.tjs.containerElement.getBoundingClientRect();
        const initialNDC = new THREE.Vector2(
            ((this.initialMousePosition.x - viewerRect.left) / viewerRect.width) * 2 - 1,
            -((this.initialMousePosition.y - viewerRect.top) / viewerRect.height) * 2 + 1
        );

        const newNDC = new THREE.Vector2(
            ((event.clientX - viewerRect.left) / viewerRect.width) * 2 - 1,
            -((event.clientY - viewerRect.top) / viewerRect.height) * 2 + 1
        );
        // Calculate vectors from centroidNDC to initialNDC and newNDC
        const vectorToInitial = new THREE.Vector2().subVectors(initialNDC, centroidNDC);
        const vectorToNew = new THREE.Vector2().subVectors(newNDC, centroidNDC);

        // Normalize the vectors
        vectorToInitial.normalize();
        vectorToNew.normalize();

        // Calculate the angle between the vectors
        let rotationAngle = Math.acos(vectorToInitial.dot(vectorToNew));

        // Determine the direction of rotation (clockwise or counterclockwise)
        // Use the cross product (in 2D space, this is essentially the z-component of the cross product)
        const crossProductZ = vectorToInitial.x * vectorToNew.y - vectorToInitial.y * vectorToNew.x;
        if (crossProductZ < 0) {
            rotationAngle = -rotationAngle; // Rotate in the opposite direction
        }

        // Get the camera's forward direction (negative z-axis in world space)
        const cameraDirection = new THREE.Vector3(0, 0, -1);
        cameraDirection.applyQuaternion(this.tjs.camera.quaternion);
    
        // Create a rotation matrix around the camera direction
        const rotationMatrix = new THREE.Matrix4().makeRotationAxis(cameraDirection, -rotationAngle);
        
        this.viewer.rotateSelectedAtoms(this.initialAtomPositions, centroid, rotationMatrix)
    }

    // Call this method after updating atoms
    dispatchAtomsUpdated() {
        const event = new CustomEvent('atomsUpdated', { detail: this.viewer.atoms });
        this.tjs.containerElement.dispatchEvent(event);
    }
}

export { EventHandlers };
