uniform float max_height;
varying float height;

vec3 color_from_height( const float height )
{
    vec3 terrain_colours[4];
    terrain_colours[0] = vec3(0.0,0.0,0.6);
    terrain_colours[1] = vec3(0.1, 0.3, 0.1);
    terrain_colours[2] =  vec3(0.4, 0.8, 0.4);
    terrain_colours[3] = vec3(1.0,1.0,1.0);
    if (height < 0.0)
        return terrain_colours[0];
    else
    {
        float hscaled = height*2.0 - 1e-05; // hscaled should range in [0,2)
        int hi = int(hscaled); // hi should range in [0,1]
        float hfrac = hscaled-float(hi); // hfrac should range in [0,1]
        if( hi == 0)
            return mix( terrain_colours[1],terrain_colours[2],hfrac); // blends between the two colours
        else
            return mix( terrain_colours[2],terrain_colours[3],hfrac); // blends between the two colours
    }
    return vec3(0.0,0.0,0.0);
}

void main()
{
    float norm_height = height/max_height;
    vec3 myColor = color_from_height(norm_height);
    gl_FragColor = vec4(myColor, 1.0);

}