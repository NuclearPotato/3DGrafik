
var canvas;
var gl;
var numberOfActiveBlocks = 0;
var newMousePosition = [];
var prevMousePosition = [];
var program;
var deleteBlock = false;
var addBlock = false;
var mousePressed = false;
var cubesTextures;

// World grid variables
var worldGrid = [];
var groundLevel = worldHeight/2;
var waterLevel = worldWidth/1.4;
var worldWidth = 10;
var worldHeight = 10;
var worldDepth = 10;
var numberOfBlocks = worldWidth*worldHeight*worldDepth;

// Buffer arrays
var blockArray = [];
var blocksPositionsInBuffer = [];
var vBuffer, newVBuffer, cBuffer, cubeVBuffer,iBuffer, sBuffer, swBuffer, centBuffer;
var iIndex = 0;
var iIndices = [];
var newPointArray = [];

var removedBlocks = [];
var sIndices = [];
var swIndices = [];
var centerPos = [];

// View variables
var fovy = 72.0;
var aspect = 1;
var near = 0.001;
var far = 1000.0;
var colorArray = [];
var pointArray = [];
var texCoordsArray = [];

var mapView;

var mvMatrix;
var rotMatrix; //Rotate the point we look at

var eye = vec3(0.0,1.2,-0.5);
var at = vec3(0.0,1.2,2.0);
const up = vec3(0.0, 1.0, 0.0);
var speed = 0;
var lastTime = 0;


// Shader related variables
var modelView;
var sBR;

// Uniform variable locations
var wireframeLoc, texMapLoc, modelViewLoc, projectionMatrix, projectionLoc , sBRotationMatrix;

// Shader attributes locations
var vPosition, vColor, cPosition, vTexCoord;

// The block function object
function Block(blockType, vecIndices, appearance)
{
    this.blockType = blockType;
    this.vecIndices = vecIndices;
    this.appearance = appearance;
}

window.onload = function Init() {
	// Initialize the canvas and GL context
    canvas = document.getElementById( "gl-canvas" );

    var Ogl = WebGLUtils.setupWebGL( canvas );
    gl = WebGLDebugUtils.makeDebugContext(Ogl);
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    aspect = canvas.width/canvas.height;
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );

    gl.enable(gl.DEPTH_TEST);

    // Initialize the coordinate system
    //initializeCoordSystem(worldWidth,worldHeight);
    Initialize3DCoordSystem(worldWidth, worldHeight, worldDepth);
    initTextures();
    HandleBufferContent();
    updateWireframe();


    // Load shaders
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

	// Uniform resource locations
    projectionLoc = gl.getUniformLocation(program, "projectionMatrix");
    sBRotationMatrix = gl.getUniformLocation(program, "sBRotationMatrix");
    modelViewLoc = gl.getUniformLocation(program, "modelView");
    texMapLoc = gl.getUniformLocation(program, "texMaps");
    wireframeLoc = gl.getUniformLocation(program, "wireframe");

    // Attribute resource locations
	vPosition = gl.getAttribLocation( program, "vPosition");
	vColor = gl.getAttribLocation( program, "vColor");
	cPosition = gl.getAttribLocation( program, "cPosition");
    vTexCoord = gl.getAttribLocation( program, "vTexCoord");


	// Initial buffer creation and initial attribute assignment
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    newVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, newVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(newPointArray), gl.STATIC_DRAW);
    //gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    //gl.enableVertexAttribArray(vPosition);

    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorArray), gl.STATIC_DRAW );
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);


    cubeVBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cubeVBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(texCoordsArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vTexCoord, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vTexCoord);

    console.log(texCoordsArray.length);
    console.log(pointArray.length);

    //cubeVBuffer.itemSize = 2;
    //cubeVBuffer.numItems = 24;

    iBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(iIndices), gl.STATIC_DRAW);

	//Buffer for small block indices
	sBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(), gl.STATIC_DRAW);

	swBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sBuffer);
	gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(), gl.STATIC_DRAW);
	
	// Center of each box, for every vertice
	centBuffer = gl.createBuffer();
	gl.bindBuffer(gl.ARRAY_BUFFER, centBuffer);
	gl.bufferData(gl.ARRAY_BUFFER, flatten(centerPos), gl.STATIC_DRAW);
	gl.vertexAttribPointer(cPosition, 3, gl.FLOAT, false, 0, 0);
	gl.enableVertexAttribArray(cPosition);
	
	sBR = mat4();
	sBR = mult(sBR, rotate(45.0, vec3(1.0, 0.0, 0.0)));
	sBR = mult(sBR, rotate(45.0, vec3(0.0, 0.0, 1.0)));
	sBR = mult(sBR, scalem(0.25,0.25,0.25));

    //Initialize Views
	updateView();

    //Adds eventListeners
    AddEvents();

    Render();
};

// ********************************************
// Coordinate system and buffer initializers
// ********************************************
function Initialize3DCoordSystem(columnSize, rowSize, depthSize)
{
    var cWidth = 2; //canvas.width in clip coords;
    var cHeight = 2; //canvas.height in clip coords;
    var cDepth = 2;

    var xPixels = cWidth/columnSize;
    var yPixels = cHeight/rowSize;
    var zPixels = cDepth/depthSize;

    var xBlockIndex = xPixels;
    var yBlockIndex = yPixels;
    var zBlockIndex = zPixels;
    for (var z = 0 ; z <= depthSize ; z++) {
        for (var y = 0 ; y <= rowSize ; y++) {
            for (var x = 0 ; x <= columnSize ; x++) {
                var vertice = vec3(xPixels*x - 1, yPixels*y - 1, zPixels*z - 1);
                worldGrid.push(vertice);

                if(z != depthSize && y != rowSize && x != columnSize) {
                    var newBlock = createBlock(x, y, z);
                    blockArray.push(newBlock);
                }
            }
        }
    }
}

function createBlock(x, y, z) {


    if (y == 0) {
        blocksPositionsInBuffer.push(blockArray.length);
        numberOfActiveBlocks++;
        return new Block("Bedrock", getBlockVertices(x, y, z), "Solid");
    }

    if (y >= worldHeight-2)
        return new Block("Air", getBlockVertices(x, y, z), "Air");

    blocksPositionsInBuffer.push(blockArray.length);
    numberOfActiveBlocks++;

    if (x >= worldWidth*0.8 && z >= worldDepth*0.8)
        return new Block("Water", getBlockVertices(x, y, z), "Liquid");

    if (x >= worldWidth*0.8 && z >= worldDepth*0.3)
        return new Block("Stone", getBlockVertices(x, y, z), "Solid");

    return new Block("Dirt", getBlockVertices(x, y, z), "Solid");

}

function getBlockVertices(x, y, z) {
    var x0y0z0 = x + y*(worldWidth+1) + z*(worldWidth+1)*(worldHeight+1);
    var x1y0z0 = x+1 + y*(worldWidth+1) + z*(worldWidth+1)*(worldHeight+1);
    var x0y1z0 = x + (y+1)*(worldWidth+1) + z*(worldWidth+1)*(worldHeight+1);
    var x1y1z0 = x+1 + (y+1)*(worldWidth+1) + z*(worldWidth+1)*(worldHeight+1);
    var x0y0z1 = x + y*(worldWidth+1) + (z+1)*(worldWidth+1)*(worldHeight+1);
    var x1y0z1 = x+1 + y*(worldWidth+1) + (z+1)*(worldWidth+1)*(worldHeight+1);
    var x0y1z1 = x + (y+1)*(worldWidth+1) + (z+1)*(worldWidth+1)*(worldHeight+1);
    var x1y1z1 = x+1 + (y+1)*(worldWidth+1) + (z+1)*(worldWidth+1)*(worldHeight+1);
 
    return [x0y0z0, x1y0z0, x0y1z0, x1y1z0, x0y0z1, x1y0z1, x0y1z1, x1y1z1];
}

function initTextures() {
    var image = document.getElementById("texImage");

    cubesTextures = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, cubesTextures);
    gl.pixelStorei(gl.UNPACK_FLIP_Y_WEBGL, true);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, image);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    //gl.generateMipmap(gl.TEXTURE_2D);
    //console.log(cubesTextures);

    gl.uniform1i(texMapLoc, 0);

    // gl.uniform1i(gl.getUniformLocation(program, "texture"), 0);
}

function HandleBufferContent() {

    blockArray.forEach(function (entry) {
        handleTrianglePointsAndColor(entry, 0, 1, 1);
        handleTrianglePointsAndColor(entry, 1, 1, 1);
        handleTrianglePointsAndColor(entry, 4, 1, 1);
        handleTrianglePointsAndColor(entry, 5, 1, 1);

        handleTrianglePointsAndColor(entry, 0, 2, 2);
        handleTrianglePointsAndColor(entry, 2, 2, 2);
        handleTrianglePointsAndColor(entry, 1, 2, 2);
        handleTrianglePointsAndColor(entry, 3, 2, 2);

        handleTrianglePointsAndColor(entry, 0, 1, 3);
        handleTrianglePointsAndColor(entry, 1, 3, 1);
        handleTrianglePointsAndColor(entry, 2, 1, 3);
        handleTrianglePointsAndColor(entry, 3, 3, 1);

        var mapPos = getTexMapLocation(entry.blockType);

        for (var i = 0 ; i < 6 ; i++) {
            handleTexPoints(mapPos[1], mapPos[0], mapPos[2]);
            handleTexPoints(mapPos[0], mapPos[2], mapPos[3]);
        }
		corner1 = worldGrid[entry.vecIndices[0]];
		corner2 = worldGrid[entry.vecIndices[7]];
		centerP = mix(corner1, corner2, 0.5);
	
		for(var j = 0; j < 36; j++)
		{
			centerPos.push(centerP);
		}
    });
    //console.log(texCoordsArray);
}

function handleTrianglePointsAndColor(block, start, firstIncrease, secondIncrease) {
    var p1 = worldGrid[block.vecIndices[start]];
    var p2 = worldGrid[block.vecIndices[start + firstIncrease]];
    var p3 = worldGrid[block.vecIndices[start + firstIncrease + secondIncrease]];

    var normalColor = AddColor(p1, p2, p3);

    pointArray.push(p1);
    pointArray.push(p2);
    pointArray.push(p3);
    colorArray.push(normalColor);
    colorArray.push(normalColor);
    colorArray.push(normalColor);

    if (block.appearance != "Air") {
        iIndices.push(iIndex);
        iIndices.push(iIndex+1);
        iIndices.push(iIndex+2);
    }
    iIndex += 3;
}
function handleTexPoints(p1, p2, p3) {

    texCoordsArray.push(p1);
    texCoordsArray.push(p2);
    texCoordsArray.push(p3);
}


function updateWireframe()
{
	var p0, p1, p2, p3, p4, p5, p6, p7;
    var frameColor = vec4(0.0, 0.0, 0.0, 1.0);
    blockArray.forEach(function(entry)
		{
			p0 = worldGrid[entry.vecIndices[0]];
			p1 = worldGrid[entry.vecIndices[1]];
			p2 = worldGrid[entry.vecIndices[2]];
			p3 = worldGrid[entry.vecIndices[3]];
			p4 = worldGrid[entry.vecIndices[4]];
			p5 = worldGrid[entry.vecIndices[5]];
			p6 = worldGrid[entry.vecIndices[6]];
			p7 = worldGrid[entry.vecIndices[7]];

			pointArray.push(p0, p1, p1, p3, p3, p2, p2, p0,
							p4, p5, p5, p7, p7, p6, p6, p4,
							p4, p0, p5, p1, p7, p3, p6, p2);
			
			corner1 = p0;
			corner2 = p7;
			centerP = mix(corner1, corner2, 0.5);

			for (var i = 0; i < 24; i++)
			{
				centerPos.push(centerP);
				colorArray.push(frameColor);
                texCoordsArray.push([]);
                if (entry.appearance != "Air") {
                    iIndices.push(iIndex + i);
                }

			}
			iIndex += 24;
		});
}

// ********************************************
// Event listening functions
// ********************************************
function AddEvents()
{
    var bP = document.getElementById("gl-canvas");
    var iP = document.getElementById("inputPanel");

    bP.addEventListener("mousedown", function(event) {
        prevMousePosition = vec2(event.clientX, event.clientY);
        mousePressed = true;
    });

    bP.addEventListener("mouseup", function(event) {
        mousePressed = false;
    });

    bP.addEventListener("mousemove", function(event) {
        if (mousePressed  && !mapView) {
            newMousePosition = vec2(event.clientX, event.clientY);
            var radX = radians(prevMousePosition[1] - newMousePosition[1]);
            var radY = radians(prevMousePosition[0] - newMousePosition[0]);
			prevMousePosition = newMousePosition;
			
            //rotMatrix = translate(0, 0, -3.0); // lookAt(eye, at, up);
			var rMat = mat4();
            rMat = mult(rMat, rotate(10*radX, [-1.0, 0.0, 0.0])); //rotate X
            rMat = mult(rMat, rotate(10*radY, [0.0, 1.0, 0.0])); //rotate Y
			
			at = subtract(at, eye);
			
			// change at vec3 to mat4 to use shitty MV.js code;
			var atMatrix = mat4(
							vec4(1.0, 0.0, 0.0, at[0]),
							vec4(0.0, 1.0, 0.0, at[1]),
							vec4(0.0, 0.0, 1.0, at[2]),
							vec4(0.0, 0.0, 0.0, 1.0));
			atMatrix = mult(rMat, atMatrix);
			
			//revert to vec3
			at = vec3(atMatrix[0][3], atMatrix[1][3], atMatrix[2][3]);
			
			at = add(at, eye);
			
			updateView();
        }
    });

    iP.addEventListener("mousedown", function(event) {
        if (event.target.id == "removeBlock")
            deleteBlock = true;
        if (event.target.id == "addBlock")
            addBlock = true;
    });


    document.addEventListener("keydown", function(event) {
        var collisions;
        var move;
        if (event.keyCode == "68" && !mapView) { //D
            move = subtract(at, eye);
            move[1] = 0.0;
            move = normalize(move);
            move = mult([0.1, 0.0, 0.1], move);
            move = vec3(-move[2], move[1], move[0]);

            collisions = CheckCollision(eye, move);
            move = mult(move, collisions);

            at = add(at, move);
            eye = add(eye, move);

        }
        if (event.keyCode == "65" && !mapView) { //A
            move = subtract(at, eye);
            move[1] = 0.0;
            move = normalize(move);
            move = mult([0.1, 0.0, 0.1], move);
            move = vec3(move[2], move[1], -move[0]);

            collisions = CheckCollision(eye, move);
            move = mult(move, collisions);

            at = add(at, move);
            eye = add(eye, move);
        }
        if (event.keyCode == "87" && !mapView) { //W

            move = subtract(at, eye);
            move[1] = 0.0;
            move = normalize(move);
            move = mult([0.1, 0.0, 0.1], move);

            collisions = CheckCollision(eye, move);
            move = mult(move, collisions);

            at = add(at, move);
            eye = add(eye, move);
        }
        if (event.keyCode == "83" && !mapView) { //S
            move = subtract(at, eye);
            move[1] = 0.0;
            move = normalize(move);
            move = mult([-0.1, -0.0, -0.1], move);

            collisions = CheckCollision(eye, move);
            move = mult(move, collisions);

            at = add(at, move);
            eye = add(eye, move);
        }
        if (event.keyCode == "9" || event.keyCode == "77") {
			mapView = !mapView;
		}
		updateView();
    });
}

// ********************************************
// Rendering
// ********************************************
function Render()
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (deleteBlock) {
        removeSelectedBlock(985);
        removeSelectedBlock(986);
        removeSelectedBlock(983);
        removeSelectedBlock(783);
        removeSelectedBlock(784);
        removeSelectedBlock(785);
        removeSelectedBlock(683);
        removeSelectedBlock(684);
        removeSelectedBlock(685);
        removeSelectedBlock(583);
        removeSelectedBlock(584);
        removeSelectedBlock(585);
        deleteBlock = false;
    }

    if (addBlock) {

        addSelectedBlock(983, "Dirt", "Solid");
        addSelectedBlock(986, "Dirt", "Solid");
        addSelectedBlock(985, "Stone", "Solid");
        addSelectedBlock(783, "Stone", "Solid");
        addSelectedBlock(784, "Stone", "Solid");
        addSelectedBlock(785, "Stone", "Solid");
        addSelectedBlock(683, "Stone", "Solid");
        addSelectedBlock(684, "Stone", "Solid");
        addSelectedBlock(685, "Stone", "Solid");
        addSelectedBlock(583, "Dirt", "Solid");
        addSelectedBlock(584, "Dirt", "Solid");
        addSelectedBlock(585, "Dirt", "Solid");

        addBlock = false;
    }

    handleGravity();

    gl.uniformMatrix4fv(modelViewLoc, false, flatten(mvMatrix));
    gl.uniformMatrix4fv(projectionLoc, false, flatten(projectionMatrix));
	gl.uniformMatrix4fv(sBRotationMatrix, false, flatten(mat4()));

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    //gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);

	//Render boxes
    //gl.drawArrays( gl.TRIANGLES, 0, 3600);
    gl.uniform4f(wireframeLoc, 1.0, 1.0, 1.0, 1.0);
    gl.drawElements(gl.TRIANGLES, iIndices.length - (24*numberOfActiveBlocks), gl.UNSIGNED_SHORT, 0);


  //  gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);


    //Render wireframes
    gl.uniform4f(wireframeLoc, 0.0, 0.0, 0.0, 1.0);
    gl.drawElements(gl.LINES, 24*numberOfActiveBlocks, gl.UNSIGNED_SHORT, 2*(iIndices.length - 24*numberOfActiveBlocks));


	//Render small blocks
    gl.uniform4f(wireframeLoc, 1.0, 1.0, 1.0, 1.0);
	renderSmallBlocks();
	
    window.requestAnimFrame(Render);
}

//Renders the small blocks that appear after removing a box
function renderSmallBlocks()
{
	sBR = mult(sBR, rotate(0.5, vec3(0.0,1.0,0.0)));
	gl.uniformMatrix4fv(sBRotationMatrix, false, flatten(sBR));
	
	//Render boxes
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sBuffer);
    gl.drawElements(gl.TRIANGLES, 36*removedBlocks.length, gl.UNSIGNED_SHORT, 0);

	//Render wireframes
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, swBuffer);
    gl.drawElements(gl.LINES, 24*removedBlocks.length, gl.UNSIGNED_SHORT, 0);

	
}

// ********************************************
// Helper functions
// ********************************************

function handleGravity() {
    var newY = [0.0, -0.05, 0.0];
    var collisions = CheckCollision(eye, newY);
    newY = mult(newY, collisions);
    at = add(at, newY);
    eye = add(eye, newY);
    updateView();
}

function getTexMapLocation(blockType) {


    var blockPos = getBlockPosOnTexMap(blockType);


    xPosOnTexMap = blockPos % 16;
    yPosOnTexMap = Math.floor(blockPos/16);

    //console.log(xPosOnTexMap + "  " + yPosOnTexMap);

    var texCoord = [
        vec2(xPosOnTexMap/16, (16-yPosOnTexMap-1)/16),
        vec2(xPosOnTexMap/16, (16-yPosOnTexMap)/16),
        vec2((xPosOnTexMap+1)/16, (16-yPosOnTexMap)/16),
        vec2((xPosOnTexMap+1)/16, (16-yPosOnTexMap-1)/16)
    ];
    //console.log(texCoord);


    return texCoord;
}

function getBlockPosOnTexMap(blockType) {

    switch (blockType) {
        case "Air" :
            return 0;
            break;
        case "Bedrock" :
            return 17;
            break;
        case "Dirt" :
            return 2;
            break;
        case "Stone" :
            return 1;
            break;
        case "Water" :
            return 205;
            break;
    }

    return 2;
}

//Returns the color of the given blockType, calculated out from the norm of the plane
function AddColor(p1, p2, p3) {
    var normal = cross(subtract(p3, p1), subtract(p2, p1));
    var colorFactor = 10;
    normal = [colorFactor*Math.abs(normal[0]), colorFactor*Math.abs(normal[1]), colorFactor*Math.abs(normal[2])];

    return vec4(normal, 1.0);
}

//Assign a blockType to a given spot in the blockArray, depending on
//the specification of the map level.
function assignBlockType(i,j)
{
    if (j > groundLevel)
       return "Air";
    else if (j === groundLevel && i <= waterLevel)
        return "Grass";
    else if (i > waterLevel)
        return "Water";
    else
        return "Dirt";
}

//Return the appearance of a block, depended on its blockType
function assignBlockAppearance(blockType)
{
    if (blockType == "Air")
        return "Air";
    if (blockType == "Lava")
        return "Dangerous";
    if (blockType == "Water")
        return "Liquid";
    if (blockType == "Dirt" || blockType == "Grass" || blockType == "Metal" ||  blockType == "Stone")
        return "Solid";
}

function removeSelectedBlock(blockNumber) {

    var blockPos = blocksPositionsInBuffer.indexOf(blockNumber-1);

    var pointStartIndex = 36*(blockPos);
    var wireframeStartIndex = 36*numberOfActiveBlocks + 24*(blockPos);

    blocksPositionsInBuffer.splice(blockPos,1);

    blockArray[blockNumber-1].blockType = "Air";
    blockArray[blockNumber-1].appearance = "Air";

    var removedWireframe = iIndices.splice(wireframeStartIndex, 24); // Deleting wireframe points
    var removedBlock = iIndices.splice(pointStartIndex, 36); // Deleting block points

	removedBlocks.push(blockNumber);
	sIndices = sIndices.concat(removedBlock);
	swIndices = swIndices.concat(removedWireframe);
	
    numberOfActiveBlocks--;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(iIndices), gl.STATIC_DRAW);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, sBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(sIndices), gl.STATIC_DRAW);
	
	gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, swBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(swIndices), gl.STATIC_DRAW);
}

function addSelectedBlock(blockNumber, blockType, blockAppearance) {

    var pointStartIndex = 36*numberOfActiveBlocks;
    var wireframeStartIndex = 36*numberOfActiveBlocks + 24*numberOfActiveBlocks;
    var pIndex = 36*(blockNumber-1);
    var wIndex = 36*(numberOfBlocks) + 24*(blockNumber-1);

    for (var i = 0 ; i < 24 ; i++) {
        iIndices.splice(wireframeStartIndex + i, 0, wIndex + i);
    }

    for (var j = 0 ; j < 36 ; j++) {
        iIndices.splice(pointStartIndex + j, 0, pIndex + j);
    }

    blockArray[blockNumber-1].blockType = blockType;
    blockArray[blockNumber-1].appearance = blockAppearance;

    var mapPos = getTexMapLocation(entry.blockType);

    for (var i = 0 ; i < 6 ; i++) {
        handleTexPoints(mapPos[1], mapPos[0], mapPos[2]);
        handleTexPoints(mapPos[0], mapPos[2], mapPos[3]);
    }


    blocksPositionsInBuffer[numberOfActiveBlocks] = blockNumber-1;

    numberOfActiveBlocks++;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(iIndices), gl.STATIC_DRAW);
}

function updateView()
{
	if(mapView)
	{
		var mapEye = vec3(0.0, 2.0, 0.0);
		var mapUp = vec3(0.0, 0.0, 1.0);
		var mapAt = vec3(0.0, 0.0, 0.0);
		
		mvMatrix = lookAt(mapEye,mapAt,mapUp);
		projectionMatrix = ortho(-1.2, 1.2, -1.2, 1.2, near, far );
	}
	else
	{
		mvMatrix = lookAt(eye,at,up);
		projectionMatrix = perspective(fovy, aspect, near, far);
	}
}

function CheckCollision(eye, vectors) {
    var newCoords = add(eye, mult([2.0, 4.0, 2.0], vectors));
    //var newCoords = add(eye, vectors);
    var axisCollision = [1.0, 1.0, 1.0];

    //Checks if outside the world for the Y axis
    if(newCoords[1] < -1.0 || 1.2 < newCoords[1])
        return axisCollision;

    //Checks if inside the world for the X and Z axis
    if(-1.0 < newCoords[0] && newCoords[0] < 1.0
        && -1.0 < newCoords[2] && newCoords[2] < 1.0) {

        if(vectors[0] != 0.0) {

            var xCollisionBlock = GetCell([newCoords[0], eye[1], eye[2]]);
            //console.log(xCollisionBlock);
            if(xCollisionBlock.appearance == "Solid")
                axisCollision[0] = 0.0;
        }

        if(vectors[1] !=0.0) {
            if(newCoords[1] > 1.0)
                newCoords[1] = 1.0;
            var yCollisionBlock = GetCell([eye[0], newCoords[1], eye[2]]);
            if(yCollisionBlock.appearance == "Solid")
                axisCollision[1] = 0.0
            if(yCollisionBlock.appearance == "Liquid")
                axisCollision[1] = 0.1;
        }

        if(vectors[2] != 0.0) {
            var zCollisionBlock = GetCell([eye[0], eye[1], newCoords[2]]);
            if(zCollisionBlock.appearance == "Solid")
                axisCollision[2] = 0.0;
        }
    }

    return axisCollision;
}

function GetCell(vec) {
    var blockWidth = 2/worldWidth;
    var blockHeight = 2/worldHeight;
    var blockDepth = 2/worldDepth;

    xBlockNumber = Math.floor((vec[0]+1)/blockWidth);
    yBlockNumber = Math.floor((vec[1]+1)/blockHeight);
    zBlockNumber = Math.floor((vec[2]+1)/blockDepth);

    if (xBlockNumber > worldWidth-1)
        xBlockNumber = worldWidth-1;

    if (yBlockNumber > worldHeight-1)
        yBlockNumber = worldHeight-1;

    if (zBlockNumber > worldDepth-1)
        zBlockNumber = worldDepth-1;

    var xBlockPos = xBlockNumber;
    var yBlockPos = yBlockNumber*worldWidth;
    var zBlockPos = zBlockNumber*worldWidth*worldHeight;
    //console.log(xBlockPos + yBlockPos + zBlockPos);
    return blockArray[xBlockPos + yBlockPos + zBlockPos];
}