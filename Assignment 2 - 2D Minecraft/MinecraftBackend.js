
var canvas;
var gl;
var blockArray = [];
var vBuffer, cBuffer, lBuffer;
var index = 0;
var cIndex;
var worldWidth = 20;
var worldHeight = 16;
var groundLevel = worldHeight/2;
var waterLevel = worldWidth/1.4;
var program;
var firstCorner, secondCorner, clickPos, waveLength;
var mousePosition = [];
var stickmanX = 0;
var stickmanY = 0;

var colors = [
    vec4(0.8, 0.8, 1.0, 1.0), // Air
    vec4(0.8, 0.6, 0.0, 1.0), // Dirt
    vec4(0.0, 1.0, 0.0, 1.0), // Grass
    vec4(0.0, 0.0, 1.0, 1.0), // Water
    vec4(0.0, 0.0, 0.0, 0.0) // Border color
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

    firstCorner = gl.getUniformLocation(program,"corner1");
    secondCorner = gl.getUniformLocation(program,"corner2");
    clickPos = gl.getUniformLocation(program,"clickPos");
    waveLength = gl.getUniformLocation(program,"waveLength");

    vBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 8*blockArray.length*4, gl.STATIC_DRAW);

    var vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);

    cBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, 16*blockArray.length*4, gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);


    var m = document.getElementById("mymenu");

    //Handle the buffer with both the border and color
    handleBuffer();

    //Create eventListener
    m.addEventListener("click", function() {
       cIndex = m.selectedIndex;
        });

    //Add eventListener
    canvas.addEventListener("mousedown", function(event)
    {
        console.log("x: "+ event.clientX + "  y: " + event.clientY  );
        //gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
        
		var clipPos = pixel_to_clip(event.clientX, event.clientY);
		gl.uniform2f(clickPos,clipPos[0],clipPos[1]);
		gl.uniform1f(waveLength,0);
		
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
        var xPos = -1 + (2*x)/canvas.width;
        var yPos = -1 + (2*(canvas.height - y))/canvas.height;
        //console.log(canvas.width + "   " + canvas.height);
        //console.log("x: " + xPos + "  y: " + yPos);
        return vec2(xPos,yPos);
}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT );
    var tempIndex = 0;
    for(var i = 0; i<index; i+=4)
    {
		var block = blockArray[i/4];

		gl.uniform2f(firstCorner,block.v2[0],block.v2[1]);
		gl.uniform2f(secondCorner,block.v3[0],block.v3[1]);

        //console.log(i);


        gl.drawArrays(gl.TRIANGLE_STRIP, i, 4);

        if (mousePosition[0] >= block.v1[0] && mousePosition[1] >= block.v1[1]
            && mousePosition[0] < block.v4[0] && mousePosition[1] < block.v4[1])
        {
            //gl.clearColor(0.0, 0.0, 0.0, 1.0);
            //gl.clear( gl.COLOR_BUFFER_BIT );
            //gl.drawArrays(gl.LINE_LOOP, i -4, 4);
            //console.log(block.v1[0] + "   " + block.v1[1]);
            //console.log(block.v4[0] + "   " + block.v4[1]);
            //console.log(i);
        }
    }
    window.requestAnimFrame(render);
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

//Assign a blockType to a given spot in the blockArray, depending on the specification of the map level.
function assignBlockType(i,j)
{
    if (j > groundLevel)
    {
       return "Air";
    }
    else if (j === groundLevel && i <= waterLevel)
    {
        return "Grass";
    }
    else if (i > waterLevel)
    {
        return "Water";
    }
    else
    {
        return "Dirt";
    }
}

function handleBuffer()
{
    blockArray.forEach(function(entry) {
        allocateToVBuffer(entry);
        index += 4;
        var blockColor = addColor(entry.blockType); //Assign a color to the block
        allocateToCBuffer(blockColor);
    });
}

function allocateToVBuffer(entry) {
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(entry.v1));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index+1), flatten(entry.v2));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index+2), flatten(entry.v3));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index+3), flatten(entry.v4));
}

function allocateToCBuffer(color) {
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-4), flatten(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-3), flatten(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-2), flatten(color));
    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-1), flatten(color));
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
        case "Water" :
            return colors[3];
            break;
    }
}


