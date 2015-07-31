var x, y, theta, gl;
var pressed = false;
var points = [];
var vertice;
var maxVertices = 1000;
var index = 0;
var vBuffer, cBuffer;

window.onload = function init()
{
    var canvas = document.getElementById( "gl-canvas" );

    gl = WebGLUtils.setupWebGL( canvas );
    if ( !gl ) { alert( "WebGL isn't available" ); }


    //var vertices = new Float32Array([-1, -1, 0, 1, 1, -1]);
    //vertice = new Float32Array([]);
    //  Configure WebGL

    gl.viewport( 0, 0, canvas.width, canvas.height );
    gl.clearColor( 1.0, 1.0, 1.0, 1.0 );

    //  Load shaders and initialize attribute buffers

    var program = initShaders( gl, "vertex-shader", "fragment-shader" );
    gl.useProgram( program );

    // Load the data into the GPU

    vBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, vBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 8*maxVertices, gl.STATIC_DRAW );

    // Associate out shader variables with our data buffer

    var vPosition = gl.getAttribLocation( program, "vPosition" );
    gl.vertexAttribPointer( vPosition, 2, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vPosition );


    cBuffer = gl.createBuffer();
    gl.bindBuffer( gl.ARRAY_BUFFER, cBuffer );
    gl.bufferData( gl.ARRAY_BUFFER, 8*maxVertices, gl.STATIC_DRAW );

    var vColor = gl.getAttribLocation( program, "vColor" );
    gl.vertexAttribPointer( vColor, 4, gl.FLOAT, false, 0, 0 );
    gl.enableVertexAttribArray( vColor );

    render();

    startPos(10,10,0);
    pen(true);
    forward(200);
};


function startPos(x,y,theta) {
    this.x = x;
    this.y = y;
    this.theta = theta;

    var vec = vec2(x, y);

    //vertice.push(vec);
    points.push(vec);
}

function forward(distance) {


    var newX = x*Math.cos(theta)*distance;
    var newY = y*Math.sin(theta)*distance;

    var newVec = vec2(newX, newY);

    points.push(newVec);

    gl.bindBuffer(gl.ARRAY_BUFFER, vBuffer);
    gl.bufferSubData(gl.ARRAY_BUFFER, 8*index, flatten(newVec));

    gl.bindBuffer(gl.ARRAY_BUFFER, cBuffer);
    index++;

    var c;

    if (pressed){
        c = vec4(1.0, 0.0, 0.0, 1.0);
        console.log();
    }
    else {
        c = vec4(1.0, 0.0, 0.0, 0.0);
    }

    gl.bufferSubData(gl.ARRAY_BUFFER, 16*(index-1), flatten(c));

    console.log(index);
    render();
}

function left(angle) {
    theta += angle;
}

function right(angle) {
    theta -= angle;
}

function pen(up_down) {
    pressed = up_down;
}

function render() {
    gl.clear( gl.COLOR_BUFFER_BIT);
    for (var i = 0; i < index; i++) {
        gl.drawArrays(gl.LINE_STRIP, i, 2);
    }
    console.log("hello");
}