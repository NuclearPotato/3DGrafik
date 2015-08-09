
var canvas;
var gl;
var numberOfActiveBlocks = 0;
var newMousePosition = [];
var prevMousePosition = [];
var program;
var deleteBlock = false;
var addBlock = false;
var mousePressed = false;

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
var vBuffer, cBuffer, iBuffer, sBuffer, swBuffer, centBuffer;
var iIndex = 0;
var iIndices = [];
var colorArray = [];
var pointArray = [];

var removedBlocks = [];
var sIndices = [];
var swIndices = [];
var centerPos = [];

// View variables
var fovy = 45.0;
var aspect = 1;
var near = 0.1;
var far = 1000.0;
var colorArray = [];
var pointArray = [];

var mapView;

var mvMatrix;
var rotMatrix; //Rotate the point we look at

var eye = vec3(0.0,1.2,-0.5);
var at = vec3(0.0,1.2,2.0);
const up = vec3(0.0, 1.0, 0.0);

// Shader related variables
var projectionLoc, modelView;
var sBR;

// Uniform variable locations
var thetaLoc, modelViewLoc, projectionMatrix, projectionLoc , sBRotationMatrix;

// Shader attributes locations
var vPosition, vColor, cPosition;

//Block material colors
var colors = [
    vec4(0.8, 0.8, 1.0, 1.0), // Air
    vec4(0.7, 0.5, 0.0, 1.0), // Dirt
    vec4(0.0, 0.8, 0.0, 1.0), // Grass
    vec4(0.8, 0.0, 0.0, 1.0), // Lava
    vec4(0.5, 0.5, 0.5, 1.0), // Stone
    vec4(0.8, 0.8, 0.8, 1.0), // Metal
    vec4(0.1, 0.3, 0.8, 1.0), // Water
    vec4(0.0, 0.0, 0.0, 1.0), // Border color
    vec4(0.0, 0.0, 0.0, 1.0)  // Stickman color
];

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
    HandleBufferContent();
    updateWireframe();

    // Load shaders
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

	// Uniform resource locations
    projectionLoc = gl.getUniformLocation(program, "projectionMatrix");
    sBRotationMatrix = gl.getUniformLocation(program, "sBRotationMatrix");
    modelViewLoc = gl.getUniformLocation(program, "modelView");

    // Attribute resource locations
	vPosition = gl.getAttribLocation( program, "vPosition");
	vColor = gl.getAttribLocation( program, "vColor");
	cPosition = gl.getAttribLocation( program, "cPosition");
		
	// Initial buffer creation and initial attribute assignment
    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(pointArray), gl.STATIC_DRAW);
    gl.vertexAttribPointer(vPosition, 3, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(colorArray), gl.STATIC_DRAW );
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);

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
    //console.log(yPixels);
    for (var z = 0 ; z <= depthSize ; z++) {
        for (var y = 0 ; y <= rowSize ; y++) {
            for (var x = 0 ; x <= columnSize ; x++) {
                var vertice = vec3(xPixels*x - 1, yPixels*y - 1, zPixels*z - 1);
                worldGrid.push(vertice);

                if(z != depthSize && y != rowSize && x != columnSize) {
                    var newBlock = new Block("Dirt", getBlockVertices(x, y, z), "Solid");
                    blockArray.push(newBlock);
                    blocksPositionsInBuffer.push(numberOfActiveBlocks);
                    numberOfActiveBlocks++;
                }
            }
        }
    }
	
	
	
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
		
		corner1 = worldGrid[entry.vecIndices[0]];
		corner2 = worldGrid[entry.vecIndices[7]];
		centerP = mix(corner1, corner2, 0.5);
	
		for(var i = 0; i < 36; i++)
		{
			centerPos.push(centerP);
		}
		
    });
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
    iIndices.push(iIndex);
    iIndices.push(iIndex+1);
    iIndices.push(iIndex+2);
    iIndex += 3;
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
				iIndices.push(iIndex + i);
			}
			iIndex += 24;
		});
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
        if (mousePressed) {
            newMousePosition = vec2(event.clientX, event.clientY);
            var radX = radians(prevMousePosition[1] - newMousePosition[1]);
            var radY = radians(prevMousePosition[0] - newMousePosition[0]);
			prevMousePosition = newMousePosition;
			
            //rotMatrix = translate(0, 0, -3.0); // lookAt(eye, at, up);
			var rMat = mat4();
            rMat = mult(rMat, rotate(10*radX, [1.0, 0.0, 0.0])); //rotate X
            rMat = mult(rMat, rotate(-(10*radY), [0.0, 1.0, 0.0])); //rotate Y
			
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

    bP.addEventListener("mousewheel", function(event) {
        if (fovy-event.wheelDelta/10 < 10)
        //Go to 1. person view
            fovy = 10;
        else if (fovy-event.wheelDelta/10 > 120)
            fovy = 120;
        else
            fovy -= event.wheelDelta/10;
    });

    iP.addEventListener("mousedown", function(event) {
        if (event.target.id == "removeBlock")
            deleteBlock = true;
        if (event.target.id == "addBlock")
            addBlock = true;
    });


    document.addEventListener("keydown", function(event) {
        console.log(event.keyCode);
        if (event.keyCode == "68") { //D
            var move = subtract(at, eye);
            move = normalize(move);
            move = mult([0.1, 0.0, 0.1], move);
            move = vec3(-move[2], move[1], move[0]);
            at = add(at, move);
            eye = add(eye, move);
        }
        if (event.keyCode == "65") { //A
            var move = subtract(at, eye);
            move = normalize(move);
            move = mult([0.1, 0.0, 0.1], move);
            move = vec3(move[2], move[1], -move[0]);
            at = add(at, move);
            eye = add(eye, move);
        }
        if (event.keyCode == "87") { //W
            var move = subtract(at, eye);
            move = normalize(move);
            move = mult([0.1, 0.0, 0.1], move);
            at = add(at, move);
            eye = add(eye, move);
        }
        if (event.keyCode == "83") { //S
            var move = subtract(at, eye);
            move = normalize(move);
            move = mult([0.1, 0.0, 0.1], move);
            at = subtract(at, move);
            eye = subtract(eye, move);
        }
		if (event.keyCode == "9" || event.keyCode == "77")
		{
			mapView = !mapView;
			updateView();
		}
    });
}

// ********************************************
// Rendering
// ********************************************
function Render()
{
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);

    if (deleteBlock) {
        removeSelectedBlock(993);
        removeSelectedBlock(995);
        removeSelectedBlock(996);
        deleteBlock = false;
        console.log(iIndices.length);
    }

    if (addBlock) {

        addSelectedBlock(995);
        addSelectedBlock(993);
        addSelectedBlock(996);

        addBlock = false;
        console.log(iIndices.length);
    }

	//mvMatrix = lookAt(eye,at,up);
    //mvMatrix = mult(mvMatrix, rotate(45, [1.0, 0.0, 0.0]));
    //console.log(flatten(mvMatrix));

    gl.uniformMatrix4fv(modelViewLoc, false, flatten(mvMatrix));
	
    gl.uniformMatrix4fv(projectionLoc, false, flatten(projectionMatrix));
	
	gl.uniformMatrix4fv(sBRotationMatrix, false, flatten(mat4()));
	

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);

	//Render boxes
    gl.drawElements(gl.TRIANGLES, iIndices.length - (24*numberOfActiveBlocks), gl.UNSIGNED_SHORT, 0);

	//Render wireframes
    gl.drawElements(gl.LINES, 24*numberOfActiveBlocks, gl.UNSIGNED_SHORT, 2*(iIndices.length - 24*numberOfActiveBlocks));

	//Render small blocks
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

function addSelectedBlock(blockNumber) {

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

    blocksPositionsInBuffer[numberOfActiveBlocks] = blockNumber-1;

    numberOfActiveBlocks++;

    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, iBuffer);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, new Uint16Array(iIndices), gl.STATIC_DRAW);
}