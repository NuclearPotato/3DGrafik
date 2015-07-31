
var canvas;
var gl;
var gridBuffer, playerLinesBuffer;
var cGridBuffer, cPlayerLinesBuffer;
var index = 0;
var grid = []; //the game grid
var playerOne = true; //is it player one now? if false it is player two
var playerLines = []; //Lines made by players
var vPosition;
var vColor;


var colors = 
[
	vec4( 0.0, 0.0, 0.0, 1.0 ),
    vec4( 0.0, 1.0, 0.0, 1.0 ), // Player 1
    vec4( 1.0, 0.0, 0.0, 1.0 )  // Player 2
];


window.onload = function init() {
    canvas = document.getElementById( "gl-canvas" );
    
    var Ogl = WebGLUtils.setupWebGL( canvas );
    gl = WebGLDebugUtils.makeDebugContext(Ogl);
    if ( !gl ) { alert( "WebGL isn't available" ); }
    
    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 0.8, 0.8, 0.8, 1.0 );
    gl.clear( gl.COLOR_BUFFER_BIT );

    // Initialize the grid
	
	grid = 
	[
		vec2(-1.0+(2.0/3.0)	,-1.0), 	//x1
		vec2(-1.0+(2.0/3.0)	, 1.0), 	//x2
		vec2(1.0 -(2.0/3.0)	,-1.0), 	//x3
		vec2(1.0 -(2.0/3.0)	, 1.0), 	//x4
		vec2(-1.0,	-1.0+(2.0/3.0)),	//y1
		vec2( 1.0,	-1.0+(2.0/3.0)),	//y2
		vec2(-1.0,	 1.0-(2.0/3.0)), 	//y3
		vec2( 1.0,	 1.0-(2.0/3.0)) 	//y4
	];


    //
    //  Load shaders and initialize 3 buffers for grid, player 1, player 2
    //
    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );
    
    //grid buffer
    gridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, flatten(grid), gl.STATIC_DRAW);
	
	cGridBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cGridBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, (16*8), gl.STATIC_DRAW );

	//player buffer
	playerLinesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, playerLinesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, (8*18), gl.STATIC_DRAW);
	
	cPlayerLinesBuffer = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, cPlayerLinesBuffer);
    gl.bufferData(gl.ARRAY_BUFFER, (16*18), gl.STATIC_DRAW );
	
	vPosition = gl.getAttribLocation( program, "vPosition");
    gl.vertexAttribPointer(vPosition, 2, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vPosition);
	
	vColor = gl.getAttribLocation( program, "vColor");
    gl.vertexAttribPointer(vColor, 4, gl.FLOAT, false, 0, 0);
    gl.enableVertexAttribArray(vColor);
	
    //Handle the buffer with both the border and color
    handleGrid();
	
    //Add eventListener
    canvas.addEventListener("mousedown", function(event)
    {
		//get grid x,y
		addLine(event.clientX,event.clientY,playerOne);
		//switch player
		playerOne = !playerOne;
		
		render();
        
    } );

    render();
}

function render()
{
    gl.clear( gl.COLOR_BUFFER_BIT );
	
	//Render 3x3 grid
    gl.bindBuffer(gl.ARRAY_BUFFER, gridBuffer);
	gl.vertexAttribPointer(vPosition,2,gl.FLOAT,false,0,0);
	gl.drawArrays(gl.LINES,0,grid.length);
	//Render player lines
	
	gl.bindBuffer(gl.ARRAY_BUFFER, playerLinesBuffer);
	gl.vertexAttribPointer(vPosition,2,gl.FLOAT,false,0,0);
	gl.drawArrays(gl.LINES,0,playerLines.length);
    
}

function getCell(x,y)
{
	//takes one dimension and determines which cell along that axis it belongs to.
	
	var cellsX = 3;
	var cellsY = 3;
	
	var absX = -1+((2*x)/canvas.width)
	var absY = -1+(((2*canvas.height)-y)/canvas.height)
	
	console.log(absX);
	console.log(absY);
	
	var cellX;
	var cellY;
	
	for(var i = 0; i < cellsX; i++)
	{
		if (absX < (-1+ (i*(2.0/cellsX))) )
		{
			cellX = i;
		}
	}
	for(var j = 0; j < cellsY; j++)
	{
		if(absY < (-1+ (j*(2.0/cellsY))) )
		{
			cellY = j;
		}
	}
	return [cellX, cellY];
}

function handleGrid()
{
	for(var i = 0; i<8; i++)
	{
		lineColor = colors[0];
		
		gl.bindBuffer( gl.ARRAY_BUFFER, cGridBuffer);
		gl.bufferSubData(gl.ARRAY_BUFFER, 16, flatten(lineColor));
	}
}

function addLine(x,y,player)
{
	var xPixels = 2.0/3.0;
    var yPixels = 2.0/3.0;
	
	var gridPos = getCell(x,y);
	var gridX = gridPos[0];
	var gridY = gridPos[1];
	
	console.log(gridX);
	console.log(gridY);
	
	var v1 = vec2(xPixels*gridX - 1, yPixels*gridY - 1);
	var v2 = vec2(xPixels*(gridX + 1) - 1, yPixels*(gridY + 1) - 1);
	
	console.log(v1);
	
	playerLines.push(v1);
	playerLines.push(v2);
	
	gl.bindBuffer( gl.ARRAY_BUFFER, playerLinesBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(v1));
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*(index+1), flatten(v2));
		
	lineColor = addColor(player);
	index += 2;
	
	gl.bindBuffer( gl.ARRAY_BUFFER, cPlayerLinesBuffer);
	gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-2), flatten(lineColor));
	gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-1), flatten(lineColor));
	
	
}

//Returns the color of the given blockType
function addColor(player)
{
    if(player)
	{
		return colors[1];
	}
	else
	{
		return colors[2];
	}
}