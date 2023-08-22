
function getPolarCoords(ox, oy, px, py) {
    const dx = px - ox;
    const dy = py - oy;


    const refAng = (dx !== 0) ? 
        Math.abs(Math.atan(dy/dx)) : 0;

    let angle = 0;

    if(dx >=0 && dy >= 0) {             // Q1
        angle = refAng
    } else if(dx <= 0 && dy >= 0) {     // Q2
        angle = Math.PI - refAng;
    } else if(dx <= 0 && dy <= 0) {     // Q3
        angle = Math.PI + refAng;
    } else if(dx >= 0 && dy <= 0) {     // Q4
        angle = 2*Math.PI - refAng;
    }

    const radius = Math.sqrt(dx**2 + dy**2);
    
    return { angle, radius };
}