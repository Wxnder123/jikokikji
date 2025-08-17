// Physics setup
const world = new CANNON.World();
world.gravity.set(0, -9.82, 0);

// Scene setup
const scene = new THREE.Scene();
const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
const renderer = new THREE.WebGLRenderer();
renderer.setSize(window.innerWidth, window.innerHeight);
document.body.appendChild(renderer.domElement);

// Lighting
const ambientLight = new THREE.AmbientLight(0xffffff, 0.5);
scene.add(ambientLight);

const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
directionalLight.position.set(0, 1, 1);
scene.add(directionalLight);

// Camera position
camera.position.z = 5;
camera.position.y = 2;

// Game objects
// Table
const tableGeometry = new THREE.BoxGeometry(4, 0.1, 2);
const tableMaterial = new THREE.MeshStandardMaterial({ color: 0x006400 });
const table = new THREE.Mesh(tableGeometry, tableMaterial);
scene.add(table);

const tableShape = new CANNON.Box(new CANNON.Vec3(2, 0.05, 1));
const tableBody = new CANNON.Body({ mass: 0 });
tableBody.addShape(tableShape);
world.addBody(tableBody);

// Net
const netGeometry = new THREE.BoxGeometry(0.02, 0.2, 2);
const netMaterial = new THREE.MeshStandardMaterial({ color: 0xffffff });
const net = new THREE.Mesh(netGeometry, netMaterial);
net.position.y = 0.15;
scene.add(net);

// Ball
const ballGeometry = new THREE.SphereGeometry(0.05, 32, 32);
const ballMaterial = new THREE.MeshStandardMaterial({ color: 0xffa500 });
const ball = new THREE.Mesh(ballGeometry, ballMaterial);
ball.position.y = 0.5;
scene.add(ball);

const ballShape = new CANNON.Sphere(0.05);
const ballBody = new CANNON.Body({ mass: 0.1 });
ballBody.addShape(ballShape);
ballBody.position.y = 0.5;
world.addBody(ballBody);

// Paddles
const paddleGeometry = new THREE.BoxGeometry(0.3, 0.05, 0.2);
const playerPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0xff0000 });
const playerPaddle = new THREE.Mesh(paddleGeometry, playerPaddleMaterial);
playerPaddle.position.set(-1.8, 0.2, 0);
scene.add(playerPaddle);

const paddleShape = new CANNON.Box(new CANNON.Vec3(0.15, 0.025, 0.1));
const playerPaddleBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
playerPaddleBody.addShape(paddleShape);
playerPaddleBody.position.set(-1.8, 0.2, 0);
world.addBody(playerPaddleBody);

const opponentPaddleMaterial = new THREE.MeshStandardMaterial({ color: 0x0000ff });
const opponentPaddle = new THREE.Mesh(paddleGeometry, opponentPaddleMaterial);
opponentPaddle.position.set(1.8, 0.2, 0);
scene.add(opponentPaddle);

const opponentPaddleBody = new CANNON.Body({ mass: 0, type: CANNON.Body.KINEMATIC });
opponentPaddleBody.addShape(paddleShape);
opponentPaddleBody.position.set(1.8, 0.2, 0);
world.addBody(opponentPaddleBody);

// Physics materials
const ballPhysicsMaterial = new CANNON.Material();
const tablePhysicsMaterial = new CANNON.Material();
const paddlePhysicsMaterial = new CANNON.Material();

const ballTableContactMaterial = new CANNON.ContactMaterial(ballPhysicsMaterial, tablePhysicsMaterial, {
    friction: 0.1,
    restitution: 0.7
});
world.addContactMaterial(ballTableContactMaterial);

const ballPaddleContactMaterial = new CANNON.ContactMaterial(ballPhysicsMaterial, paddlePhysicsMaterial, {
    friction: 0.1,
    restitution: 0.9
});
world.addContactMaterial(ballPaddleContactMaterial);

ballBody.material = ballPhysicsMaterial;
tableBody.material = tablePhysicsMaterial;
playerPaddleBody.material = paddlePhysicsMaterial;
opponentPaddleBody.material = paddlePhysicsMaterial;


// Sound effects
const paddleHitSound = new Audio('https://gfxsounds.com/wp-content/uploads/2021/03/Hitting-the-ball-table-tennis-paddle.mp3');
const tableBounceSound = new Audio('https://gfxsounds.com/wp-content/uploads/2021/03/Ping-pong-ball-bouncing.mp3');

ballBody.addEventListener('collide', (event) => {
    if (event.body === playerPaddleBody || event.body === opponentPaddleBody) {
        paddleHitSound.play();
    } else if (event.body === tableBody) {
        tableBounceSound.play();
    }
});

// Mouse controls
const raycaster = new THREE.Raycaster();
const mouse = new THREE.Vector2();
const plane = new THREE.Plane(new THREE.Vector3(0, 1, 0), -0.2);
const intersection = new THREE.Vector3();

window.addEventListener('mousemove', (event) => {
    mouse.x = (event.clientX / window.innerWidth) * 2 - 1;
    mouse.y = -(event.clientY / window.innerHeight) * 2 + 1;

    raycaster.setFromCamera(mouse, camera);
    raycaster.ray.intersectPlane(plane, intersection);
    playerPaddleBody.position.z = intersection.z;
});

window.addEventListener('mousedown', () => {
    if (ballBody.position.y < 0.5) {
        ballBody.position.set(-1, 0.5, 0);
        ballBody.velocity.set(5, 2, 0);
    }
});

let playerScore = 0;
let opponentScore = 0;
const scoreElement = document.getElementById('score');

// Animation loop
function animate() {
    requestAnimationFrame(animate);

    // Step the physics world
    world.step(1 / 60);

    // Update the ball's position
    ball.position.copy(ballBody.position);
    ball.quaternion.copy(ballBody.quaternion);

    // Update the player paddle's position
    playerPaddle.position.copy(playerPaddleBody.position);
    playerPaddle.quaternion.copy(playerPaddleBody.quaternion);

    // AI opponent
    opponentPaddleBody.position.z += (ballBody.position.z - opponentPaddleBody.position.z) * 0.1;
    opponentPaddle.position.copy(opponentPaddleBody.position);
    opponentPaddle.quaternion.copy(opponentPaddleBody.quaternion);

    // Scoring
    if (ballBody.position.x > 2.1) {
        playerScore++;
        updateScore();
        resetBall();
    } else if (ballBody.position.x < -2.1) {
        opponentScore++;
        updateScore();
        resetBall();
    }

    renderer.render(scene, camera);
}

function updateScore() {
    scoreElement.innerHTML = "Player: " + playerScore + " - Opponent: " + opponentScore;
}

function resetBall() {
    ballBody.position.set(0, 0.5, 0);
    ballBody.velocity.set(0, 0, 0);
}

animate();
