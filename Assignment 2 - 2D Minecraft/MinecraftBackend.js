
var canvas;
var gl;
var blockArray = [];
var stickmanArray = [];
var vBuffer, cBuffer, lBuffer;
var index = 0;
var cIndex = 0;
var worldWidth = 40;
var worldHeight = 32;
var groundLevel = worldHeight/2;
var waterLevel = worldWidth/1.4;
var mousePosition = [];
var program;
var changeBlock = false;
var chosenBLockType = "Air";
var lastKeyPress;

// Uniform variable locations
var firstCorner, secondCorner, clickPos, waveLength, isSpecial, offset;

// Variables used for shaders
var waveRadius = 0.5;

// Stickman variables
var stickmanStartXBlock = 5;
var stickmanStartYBlock = 1;
var stickManInitialIndex = (worldHeight*stickmanStartXBlock + groundLevel + stickmanStartYBlock);
var stickManOffset = [0.0, 0.0];
var stickmanX = 0.0;
var stickmanY = 0.0;

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

window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );

    var Ogl = WebGLUtils.setupWebGL( canvas );
    gl = WebGLDebugUtils.makeDebugContext(Ogl);
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );

    // Initialize the coordinate system
    initializeCoordSystem(worldWidth,worldHeight);

    //  Load shaders and initialize attribute buffers
    program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

	// Uniform resource locations
    firstCorner = gl.getUniformLocation(program,"corner1");
    secondCorner = gl.getUniformLocation(program,"corner2");
    clickPos = gl.getUniformLocation(program,"clickPos");
    waveLength = gl.getUniformLocation(program,"waveLength");
    isSpecial = gl.getUniformLocation(program,"isSpecial"); //1.0 air, 2.0 stickman
    offset = gl.getUniformLocation(program,"offset");

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8*((blockArray.length+1)*4 + 8), gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16*((blockArray.length+1)*4 + 8), gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);


    //Handle the buffer with both the border and color
    handleBuffer();
    handleStickmanBuffer();

    //Adds eventListeners
    addEvents();

    document.onkeydown = function (event) {
        moveStickMan(event);
    };
  
    document.onkeyup = function (event) {
        stopStickMan(event);
    };
    render();
};

//Adds eventListeners
function addEvents() {

    var m = document.getElementById("mymenu");
    var bP = document.getElementById("inputPanel");


    //Create eventListener for the menu
    m.addEventListener("click", function() {
        cIndex = m.selectedIndex;
        chosenBLockType = m.value;
    });

    bP.addEventListener("mousedown", function(event) {
        moveStickMan(event)});

    bP.addEventListener("mouseup", function(event) {
        stopStickMan(event)});

    canvas.addEventListener("mousedown", function(event) {
        changeBlock = true;
        var clipPos = pixel_to_clip(event.clientX, event.clientY);

        waveRadius = 0.0;

        gl.uniform2f(clickPos,clipPos[0],clipPos[1]);
        gl.uniform1f(waveLength,waveRadius);
    } );

    canvas.addEventListener("mousemove", function(event) {
        //Converting from window coordinates to clip coordinates
        mousePosition = pixel_to_clip(event.clientX,event.clientY);
    });
}

function moveStickMan(event)
{
    if ((event.keyCode === 87 && lastKeyPress != 87) || event.srcElement.id == "upButton") { // W
        // Jump. Can air jump too :)
        lastKeyPress = 87;
        stickmanY = 0.02;
    }
    if (event.keyCode === 65 || event.srcElement.id == "leftButton")
    // A
    // Move left
        stickmanX = -0.01;
    if (event.keyCode === 83) {} // S
    // Not Implemented yet
    // Swim?
    if (event.keyCode === 68 || event.srcElement.id == "rightButton")
    // D
    // Move right
        stickmanX = 0.01;
}

function stopStickMan(event)
{
    if (event.keyCode === 87 || event.srcElement.id == "upButton") { // W
        stickmanY = 0;
        lastKeyPress = 0;
    }
    if (event.keyCode === 65 || event.keyCode === 68
        || event.srcElement.id == "leftButton"
        || event.srcElement.id == "rightButton")  // A or D
    // Stop moving
        stickmanX = 0;
    if (event.keyCode === 83) {} // S
    // Not Implemented yet
    // Swim?
}

function pixel_to_clip(x,y)
{
		//Converting from window coordinates to clip coordinates
        var xPos = -1 + (2*x)/canvas.clientWidth;
        var yPos = -1 + (2*(canvas.clientHeight - y))/canvas.clientHeight;
        return vec2(xPos,yPos);
}

function render()
{
    var blockIndex = 0;
    gl.clear( gl.COLOR_BUFFER_BIT );
    for(var i = 0; i<index; i+=4)
    {
		var currentBlock = blockArray[i/4];

		gl.uniform2f(firstCorner,currentBlock.v2[0],currentBlock.v2[1]);
		gl.uniform2f(secondCorner,currentBlock.v3[0],currentBlock.v3[1]);

		//Avoid gradient on air blocks.
		if(currentBlock.blockType == "Air")
			gl.uniform1f(isSpecial, 1.0);
		else
			gl.uniform1f(isSpecial,0.0);

        gl.drawArrays(gl.TRIANGLE_STRIP, i, 4);

        //Reallocate to the buffer, where to render a border around the box, which the mouse is over
        if (mousePosition[0] >= currentBlock.v1[0] && mousePosition[1] >= currentBlock.v1[1]
            && mousePosition[0] < currentBlock.v4[0] && mousePosition[1] < currentBlock.v4[1])
        {
            blockIndex = i/4;

            var tempBlock = new block("Border", currentBlock.v1, currentBlock.v2, currentBlock.v4, currentBlock.v3);
            var tempIndex = index;
            index = blockArray.length*4;
            allocateToVBuffer(tempBlock, index);
            index += 4;
            var borderColor = vec4(0.0, 0.0, 0.0, 1.0);
            allocateToCBuffer(borderColor, index);
            index = tempIndex;
        }
    }

    //Checks if it is possible to build a block
    if (checkBlockTypesAround(blockIndex))
    {
        //If changeblock is true, it replaces the block with the one chosen in the menu
        if (changeBlock) {

            var bType = blockArray[blockIndex].blockType;

            //Removes block if the chosen block is the same as the selected block from the menu
            if (bType == chosenBLockType) {
                blockArray[blockIndex].blockType = "Air";
                blockArray[blockIndex].appearance = assignBlockAppearance("Air");
                var newColor = addColor("Air");
            }
            else {
                blockArray[blockIndex].blockType = chosenBLockType;
                blockArray[blockIndex].appearance = assignBlockAppearance(chosenBLockType);
                var newColor = addColor(chosenBLockType);
            }
            allocateToCBuffer(newColor, blockIndex*4 + 4);
        }
        gl.drawArrays(gl.LINE_LOOP, blockArray.length*4, 4);
    }

    //Draw the stickman
    renderStickman();
    
	//Handle rippling effect
	if(waveRadius < 0.5)
	{
		waveRadius += 0.02;
		gl.uniform1f(waveLength,waveRadius);
	}

    changeBlock = false;
    window.requestAnimFrame(render);
}

function renderStickman()
{
	//Checks collision
    var collisionBlock = checkCollision();

	//Handle collisions
	var blockAppearance = collisionBlock.appearance;
	var blockY = 2.0;
	
	if(blockAppearance == "Dangerous") //Lava
		stickmanY = 0.02;
    else if(blockAppearance == "Solid") //Ground
    {
		blockY = collisionBlock.v1[1];
		stickmanY = 0.0;
	}
	else if(blockAppearance == "Liquid") //Water
		stickmanY -= 0.00005;
    else if(blockAppearance == "Border") //At the border of the map
    {

        stickManOffset[0] = 0.0 - collisionBlock.v1;
        stickManOffset[1] = 0.0 + collisionBlock.v2;
        stickmanX = 0.0;
        stickmanY = 0.0;
    }
	else //Gravity
		stickmanY -= 0.001;

	//set offset in the vertex shader
	if(blockY != 2.0)
	{
 		stickManOffset = [stickManOffset[0]+stickmanX, blockY];
		gl.uniform4f(offset,stickManOffset[0],stickManOffset[1],0.0,0.0);
	}
	else if(stickmanX > 0.000005 || stickmanX < 0.000005)
	{
		stickManOffset = [stickManOffset[0]+stickmanX, stickManOffset[1]+stickmanY];
		gl.uniform4f(offset,stickManOffset[0],stickManOffset[1],0.0,0.0);
	}
	gl.uniform1f(isSpecial,2.0);
	
	//render the stickman
    var stickmanIndex = (blockArray.length+1)*4;
    gl.drawArrays(gl.LINES, stickmanIndex, 8);
}


function block(blockType, v1, v2, v3, v4, appearance)
{
    this.blockType = blockType;
    this.v1 = v1;
    this.v2 = v2;
    this.v3 = v3;
    this.v4 = v4;
    this.appearance = appearance;
}

function initializeCoordSystem(columnSize, rowSize)
{
    var cWidth = 2; //canvas.width in clip coords;
    var cHeight = 2; //canvas.height in clip coords;

    var xPixels = cWidth/columnSize;
    var yPixels = cHeight/rowSize;

    for (i = 0 ; i < columnSize ; i++)
    {
        for (j = 0 ; j < rowSize ; j++)
        {
            var v1 = vec2(xPixels*i - 1, yPixels*j - 1);
            var v2 = vec2(xPixels*(i + 1) - 1, yPixels*j - 1);
            var v3 = vec2(xPixels*i - 1, yPixels*(j + 1) - 1);
            var v4 = vec2(xPixels*(i + 1) - 1, yPixels*(j + 1) - 1);

            var blockType = assignBlockType(i,j);
			var blockAppearance = assignBlockAppearance(blockType);

            blockArray.push(new block(blockType,v1,v2,v3,v4,blockAppearance));
        }
    }
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

//Calculates the clip coords of the vertices of the stickman
function handleStickmanBuffer()
{
    var blockOfLowerBody = blockArray[stickManInitialIndex];
    var blockOfUpperBody = blockArray[stickManInitialIndex+1];

    var v1 = blockOfLowerBody.v1;
    var v2 = blockOfLowerBody.v2;
    var v3 = mix(blockOfLowerBody.v3, blockOfLowerBody.v4, 0.5);
    var v4 = mix(blockOfUpperBody.v3, blockOfUpperBody.v4, 0.5);
    v4[1] -= 0.005; //gets a smaller neck, which result in that the stickman is 2 blocks high
    var v5 = mix(blockOfUpperBody.v1, blockOfUpperBody.v3, 0.5);
    var v6 = mix(blockOfUpperBody.v2, blockOfUpperBody.v4, 0.5);
    stickmanArray = [v1, v2, v4, v5, v6];

    var lowerBody = new block("Stickman", v1, v3, v2, v3);
    var upperBody = new block("Stickman", v4, v3, v5, v6);

    var stickmanIndex = (blockArray.length + 1) * 4;

    //Allocates the stickman positions in the buffers
    allocateToVBuffer(lowerBody, stickmanIndex);
    allocateToVBuffer(upperBody, stickmanIndex + 4);
    var color = vec4(0.0, 0.0, 0.0, 1.0);
    allocateToCBuffer(color, stickmanIndex + 4);
    allocateToCBuffer(color, stickmanIndex + 8);
}

function handleBuffer()
{
    blockArray.forEach(function(entry) {
        allocateToVBuffer(entry, index);
        index += 4;
        var blockColor = addColor(entry.blockType); //Assign a color to the block
        allocateToCBuffer(blockColor, index);
    });
}

function allocateToVBuffer(entry, currentIndex) {
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*currentIndex, flatten(entry.v1));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*(currentIndex+1), flatten(entry.v2));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*(currentIndex+2), flatten(entry.v3));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*(currentIndex+3), flatten(entry.v4));
}

function allocateToCBuffer(color,currentIndex) {
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(currentIndex-4), flatten(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(currentIndex-3), flatten(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(currentIndex-2), flatten(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(currentIndex-1), flatten(color));
}

//Returns the color of the given blockType
function addColor(blockType)
{
    switch (blockType)
    {
        case "Air" :
            return colors[0];
            break;
        case "Dirt" :
            return colors[1];
            break;
        case "Grass" :
            return colors[2];
            break;
        case "Lava" :
            return colors[3];
            break;
		case "Stone" :
            return colors[4];
            break;
		case "Metal" :
            return colors[5];
            break;
		case "Water" :
            return colors[6];
            break;
		case "Border" :
            return colors[7];
            break;
        case "Stickman" :
            return colors[8];
            break;
    }
}

//Returns false if there is only air around the block in the blockArray
// of the given index.
function checkBlockTypesAround(blockIndex)
{
    var topBool,leftBool,rightBool;
    var airCounter = 0;
    var numberOfPossibleAir = 4;

    if (blockIndex % worldHeight == 0 || blockArray[blockIndex].blockType != "Air")
        return true;

    if (blockIndex % worldHeight == worldHeight-1) {
        topBool = true;
        numberOfPossibleAir--;
    }

    if (blockIndex + worldHeight > blockArray.length) {
        rightBool = true;
        numberOfPossibleAir--;
    }

    if (blockIndex - worldHeight < 0) {
        leftBool = true;
        numberOfPossibleAir--;
    }

    if (blockArray[blockIndex-1].blockType == "Air")
        airCounter++;

    if (!topBool && blockArray[blockIndex+1].blockType == "Air")
        airCounter++;

    if (!rightBool && blockArray[blockIndex+worldHeight].blockType == "Air")
        airCounter++;

    if (!leftBool && blockArray[blockIndex-worldHeight].blockType == "Air")
        airCounter++;

    return airCounter != numberOfPossibleAir;
}

function checkCollision()
{
    var priorityNumber = 100;
    var currentCollisionBlock;
    var finalCollisionBlock = new block("Air");
    //Finds the blocks the vertices is in and check for appearance of these blocks
        stickmanArray.some(function(entry) {
            var tempEntry = [entry[0] + stickManOffset[0], entry[1] + stickManOffset[1]];
            currentCollisionBlock = getCell(tempEntry);

            if (currentCollisionBlock.appearance == "Border")
                return finalCollisionBlock = currentCollisionBlock;

            if (currentCollisionBlock.appearance == "Dangerous") {
                finalCollisionBlock = currentCollisionBlock;
                priorityNumber = 1;
            }

            if (currentCollisionBlock.appearance == "Solid" && priorityNumber > 2) {
                finalCollisionBlock = currentCollisionBlock;
                priorityNumber = 2;
            }
            else if (currentCollisionBlock.appearance == "Liquid" && priorityNumber > 3) {
                finalCollisionBlock = currentCollisionBlock;
                priorityNumber = 3;
            }
        });
    return finalCollisionBlock;
}

function getCell(vec)
{
    var blockWidth = 2/worldWidth;
    var blockHeight = 2/worldHeight;
    var xPos = Math.ceil((vec[0]+1)/blockWidth)*worldHeight - worldHeight;
    var yPos = Math.floor((vec[1]+1)/blockHeight);
    var blockIndex = xPos + yPos;
    if(blockIndex > blockArray.length)
    if(blockIndex > blockArray.length)
        return new block("Border",
                         2/worldWidth * stickmanStartXBlock - 0.001, //Values of the new stickman position
                         stickManOffset[1],
                         0.0, 0.0, "Border");

    if(blockIndex < 0)
        return new block("Border",
                         2/worldWidth * (stickmanStartXBlock - worldWidth + 1) + 0.001, //Values of the new stickman position
                         stickManOffset[1],
                         0.0, 0.0, "Border");
    return blockArray[blockIndex];
}
