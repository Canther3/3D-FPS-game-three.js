import * as CANNON from 'cannon-es';
import { Vec3 } from 'cannon-es';

export class PhysicsWorld {
    constructor() {
        // Create physics world
        this.world = new CANNON.World();
        
        // Set gravity
        this.world.gravity.set(0, -9.82, 0); // m/s²
        
        // Performance optimization
        this.world.broadphase = new CANNON.SAPBroadphase(this.world);
        this.world.allowSleep = true;
        
        // Create materials
        this.defaultMaterial = new CANNON.Material('default');
        this.playerMaterial = new CANNON.Material('player');
        this.groundMaterial = new CANNON.Material('ground');
        
        // Define contact behaviors - Improve player movement by reducing friction
        const playerGroundContact = new CANNON.ContactMaterial(
            this.playerMaterial,
            this.groundMaterial,
            {
                friction: 0.01,        // Reduced from 0.1 to 0.01 for minimal resistance
                restitution: 0.1       // Reduced from 0.2 to 0.1
            }
        );
        
        const defaultContact = new CANNON.ContactMaterial(
            this.defaultMaterial,
            this.defaultMaterial,
            {
                friction: 0.3,
                restitution: 0.2
            }
        );
        
        // Add contact materials to world
        this.world.addContactMaterial(playerGroundContact);
        this.world.addContactMaterial(defaultContact);
        
        // Set default contact material
        this.world.defaultContactMaterial = defaultContact;
        
        // Create ground plane (will be replaced by level geometry)
        this.addGround();
    }
    
    update(deltaTime) {
        // Fixed time step for stability
        const timeStep = 1/60; // seconds
        
        // Max substeps to keep game smooth with variable framerate
        const maxSubSteps = 5;
        
        // Update physics world
        this.world.step(timeStep, deltaTime, maxSubSteps);
    }
    
    addGround() {
        // Create a ground plane
        const groundShape = new CANNON.Plane();
        const groundBody = new CANNON.Body({
            mass: 0, // mass of 0 means static object
            shape: groundShape,
            material: this.groundMaterial
        });
        
        // Rotate ground plane to be horizontal
        groundBody.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0), 
            -Math.PI / 2
        );
        
        // Add ground to physics world
        this.world.addBody(groundBody);
    }
    
    addBox(position, size, mass = 0, material = this.defaultMaterial) {
        // Create box shape
        const boxShape = new CANNON.Box(new CANNON.Vec3(
            size.x / 2, size.y / 2, size.z / 2
        ));
        
        // Create physics body
        const boxBody = new CANNON.Body({
            mass: mass,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            shape: boxShape,
            material: material
        });
        
        // Add body to physics world
        this.world.addBody(boxBody);
        
        return boxBody;
    }
    
    addSphere(position, radius, mass = 0, material = this.defaultMaterial) {
        // Create sphere shape
        const sphereShape = new CANNON.Sphere(radius);
        
        // Create physics body
        const sphereBody = new CANNON.Body({
            mass: mass,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            shape: sphereShape,
            material: material
        });
        
        // Add body to physics world
        this.world.addBody(sphereBody);
        
        return sphereBody;
    }
    
    addCylinder(position, radius, height, mass = 0, material = this.defaultMaterial) {
        // Create cylinder shape
        const cylinderShape = new CANNON.Cylinder(radius, radius, height, 16);
        
        // Create physics body
        const cylinderBody = new CANNON.Body({
            mass: mass,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            shape: cylinderShape,
            material: material
        });
        
        // Rotate cylinder to stand upright
        cylinderBody.quaternion.setFromAxisAngle(
            new CANNON.Vec3(1, 0, 0), 
            Math.PI / 2
        );
        
        // Add body to physics world
        this.world.addBody(cylinderBody);
        
        return cylinderBody;
    }
    
    addTrimesh(vertices, indices, position, mass = 0, material = this.defaultMaterial) {
        // Create trimesh shape
        const trimeshShape = new CANNON.Trimesh(vertices, indices);
        
        // Create physics body
        const trimeshBody = new CANNON.Body({
            mass: mass,
            position: new CANNON.Vec3(position.x, position.y, position.z),
            shape: trimeshShape,
            material: material
        });
        
        // Add body to physics world
        this.world.addBody(trimeshBody);
        
        return trimeshBody;
    }
    
    raycastFirst(from, direction, maxDistance = Infinity) {
        // Set up raycasting options
        const raycastOptions = {
            from: from,
            to: new Vec3(
                from.x + direction.x * maxDistance,
                from.y + direction.y * maxDistance,
                from.z + direction.z * maxDistance
            ),
            skipBackfaces: true
        };
        
        // Perform raycast
        const result = new CANNON.RaycastResult();
        this.world.raycastClosest(raycastOptions, result);
        
        if (result.hasHit) {
            return {
                body: result.body,
                point: result.hitPointWorld,
                normal: result.hitNormalWorld,
                distance: result.distance
            };
        }
        
        return null;
    }
    
    raycast(from, direction, maxDistance = Infinity, filterFn = null) {
        // Set up raycasting options
        const raycastOptions = {
            from: from,
            to: new Vec3(
                from.x + direction.x * maxDistance,
                from.y + direction.y * maxDistance,
                from.z + direction.z * maxDistance
            ),
            skipBackfaces: true
        };
        
        // Perform raycast
        const results = [];
        this.world.raycastAll(raycastOptions, (result) => {
            // Apply filter if provided
            if (filterFn && !filterFn(result.body)) {
                return;
            }
            
            results.push({
                body: result.body,
                point: result.hitPointWorld,
                normal: result.hitNormalWorld,
                distance: result.distance
            });
        });
        
        // Sort results by distance
        results.sort((a, b) => a.distance - b.distance);
        
        return results;
    }
    
    removeBody(body) {
        this.world.removeBody(body);
    }
    
    reset() {
        // Remove all bodies except ground
        const bodiesToRemove = [];
        
        this.world.bodies.forEach(body => {
            // Skip ground plane
            if (body.type === CANNON.Body.STATIC && 
                body.shapes[0] instanceof CANNON.Plane) {
                return;
            }
            
            bodiesToRemove.push(body);
        });
        
        // Remove bodies from world
        bodiesToRemove.forEach(body => {
            this.world.removeBody(body);
        });
    }
} 