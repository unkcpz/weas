

export function setupCameraGUI(gui, camera) {

    // Create a folder for camera parameters
    const cameraFolder = gui.addFolder('Camera');

    cameraFolder.add(camera.position, 'x', -10, 10).name('X Position');
    cameraFolder.add(camera.position, 'y', -10, 10).name('Y Position');
    cameraFolder.add(camera.position, 'z', -10, 10).name('Z Position');

    cameraFolder.add(camera.rotation, 'x', -Math.PI, Math.PI).name('X Rotation');
    cameraFolder.add(camera.rotation, 'y', -Math.PI, Math.PI).name('Y Rotation');
    cameraFolder.add(camera.rotation, 'z', -Math.PI, Math.PI).name('Z Rotation');

    const cameraParams = {
        fov: camera.fov,
        near: camera.near,
        far: camera.far,
    };

}
