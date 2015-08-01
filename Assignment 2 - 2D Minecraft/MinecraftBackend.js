
var canvas;
var gl;
var blockArray = [];
var stickmanLowerArray = [];
var stickmanUpperArray = [];
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

// Uniform variable locations
var firstCorner, secondCorner, clickPos, waveLength, isSpecial, offset;

// Variables used for shaders
var waveRadius = 0.5;

var stickManOffset = [0.0, 0.0];
var stickmanX = 0.0;
var stickmanY = 0.0;

//Block material colors
var colors = [
    vec4(0.8, 0.8, 1.0, 1.0), // Air
    vec4(0.7, 0.5, 0.0, 1.0), // Dirt
    vec4(0.0, 0.8, 0.0, 1.0), // Grass
    vec4(0.8, 0.0, 0.0, 1.0), // Lava
    vec4(0.5, 0.5, 0.5, 1.0), // Metal
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

    //
    //  Load shaders and initialize attribute buffers
    //
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


    var m = document.getElementById("mymenu");

    //Handle the buffer with both the border and color
    handleBuffer();
    handleStickmanBuffer();

    //Create eventListener
    m.addEventListener("click", function() {
        cIndex = m.selectedIndex;
        chosenBLockType = m.value;
        });

    //Add eventListener
    canvas.addEventListener("mousedown", function(event)
    {
        console.log("x: "+ event.clientX + "  y: " + event.clientY  );
        //gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
        changeBlock = true;
		var clipPos = pixel_to_clip(event.clientX, event.clientY);
		
		waveRadius = 0.0;
		
		gl.uniform2f(clickPos,clipPos[0],clipPos[1]);
		gl.uniform1f(waveLength,waveRadius);
		
    } );

    canvas.addEventListener("mousemove", function(event)
    {
        //Converting from window coordinates to clip coordinates
		
        mousePosition = pixel_to_clip(event.clientX,event.clientY);
    });
    
    document.onkeydown = function (event) {
    if (event.keyCode === 87) {
      // W
      //Jump?
    }
    if (event.keyCode === 65) {
      // A
      stickmanX -= 0.05;
    }
    if (event.keyCode === 83) {
      // S
      // Swim?
    }
    if (event.keyCode === 68) {
      // D
      stickmanX += 0.05;
    }
    console.log("x: " + stickmanX + "  y: " + stickmanY  );
  };

    render();
};

function pixel_to_clip(x,y)
{
		//Converting from window coordinates to clip coordinates
        var xPos = -1 + (2*x)/canvas.clientWidth;
        var yPos = -1 + (2*(canvas.clientHeight - y))/canvas.clientHeight;
        //console.log(canvas.width + "   " + canvas.height);
        //console.log("x: " + xPos + "  y: " + yPos);
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

    if (checkBlockTypesAround(blockIndex)) //Checks if it is possible to build a block
    {
        if (changeBlock) {
            blockArray[blockIndex].blockType = chosenBLockType;
            var newColor = addColor(chosenBLockType);
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
	//set offset in the vertex shader
	
	if(stickmanX > 0.00005 && stickmanY > 0.00005)
	{
		stickManOffset = [stickManOffset[0]+stickmanX, stickManOffset[1]+stickmanY];
		gl.uniform2f(offset,stickManOffset[0],stickManOffset[1]);
	}
	gl.uniform1f(isSpecial,2.0);
	
	//render the stickman
    var stickmanIndex = (blockArray.length+1)*4;
    gl.drawArrays(gl.LINES, stickmanIndex, 8);
}


function block(blockType, v1, v2, v3, v4)
{
    this.blockType = blockType;
    this.v1 = v1;
    this.v2 = v2;
    this.v3 = v3;
    this.v4 = v4;
}

function initializeCoordSystem(columnSize, rowSize)
{
    var cWidth = 2; //canvas.width;
    var cHeight = 2; //canvas.height;

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
			
            blockArray.push(new block(blockType,v1,v2,v3,v4));
        }
    }
}

function handleStickmanBuffer()
{
    var blockOfLowerBody = blockArray[groundLevel + 1 + worldHeight * 5];
    var blockOfUpperBody = blockArray[groundLevel + 2 + worldHeight * 5];

    var v1 = blockOfLowerBody.v1;
    var v2 = blockOfLowerBody.v2;
    var v3 = mix(blockOfLowerBody.v3, blockOfLowerBody.v4, 0.5);
    var v4 = mix(blockOfUpperBody.v3, blockOfUpperBody.v4, 0.5);
    var v5 = mix(blockOfUpperBody.v1, blockOfUpperBody.v3, 0.5);
    var v6 = mix(blockOfUpperBody.v2, blockOfUpperBody.v4, 0.5);
    //console.log(v3);

    stickmanArray[0] = new block("Stickman", v1, v3, v2, v3);
    stickmanArray[1] = new block("Stickman", v4, v3, v5, v6);

    /*
    stickmanLowerArray.push(v1);
    stickmanLowerArray.push(v3);
    stickmanLowerArray.push(v2);
    stickmanLowerArray.push(v3);
    stickmanUpperArray.push(v4);
    stickmanUpperArray.push(v3);
    stickmanUpperArray.push(v5);
    stickmanUpperArray.push(v6);
*/
    var stickmanIndex = (blockArray.length + 1) * 4;

    allocateToVBuffer(stickmanArray[0], stickmanIndex);
    allocateToVBuffer(stickmanArray[1], stickmanIndex + 4);

    var color = vec4(0.0, 0.0, 0.0, 1.0);

    allocateToCBuffer(color, stickmanIndex + 4);
    allocateToCBuffer(color, stickmanIndex + 8);
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
		case "Metal" :
            return colors[4];
            break;
		case "Water" :
            return colors[5];
            break;
		case "Border" :
            return colors[6];
            break;
        case "Stickman" :
            return colors[7]
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


