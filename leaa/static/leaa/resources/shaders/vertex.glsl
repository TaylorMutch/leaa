uniform float displacement;

varying float height;

void main()
{
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position.x,position.y,position.z*displacement,1.0);
    height = position.z;
}