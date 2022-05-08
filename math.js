export class Matrix4 extends Array {
  constructor() {
    super(16);
    this.identity();
  }

  // prettier-ignore
  copyFrom(s) {
    const t = this;
    t[0] = s[0]; t[4] = s[4]; t[8] = s[8];   t[12] = s[12];
    t[1] = s[1]; t[5] = s[5]; t[9] = s[9];   t[13] = s[13];
    t[2] = s[2]; t[6] = s[6]; t[10] = s[10]; t[14] = s[14];
    t[3] = s[3]; t[7] = s[7]; t[11] = s[11]; t[15] = s[15];
    return this;
  }

  perspective(fieldOfViewInRadians, aspect, near, far) {
    var f = Math.tan(Math.PI * 0.5 - 0.5 * fieldOfViewInRadians);
    var rangeInv = 1.0 / (near - far);

    // prettier-ignore
    this.set( 
      f / aspect, 0, 0, 0,
      0, f, 0, 0,
      0, 0, (near + far) * rangeInv, near * far * rangeInv * 2,
      0, 0, -1, 0);

    return this;
  }

  /**
   * 行主序的入参
   */
  // prettier-ignore
  set(
    n11, n12, n13, n14, 
    n21, n22, n23, n24,
    n31, n32, n33, n34,
    n41, n42, n43, n44,
  ) {
    const t = this;

    t[0] = n11; t[4] = n12; t[8] = n13; t[12] = n14;
    t[1] = n21; t[5] = n22; t[9] = n23; t[13] = n24;
    t[2] = n31; t[6] = n32; t[10] = n33; t[14] = n34;
    t[3] = n41; t[7] = n42; t[11] = n43; t[15] = n44;

    return this;
  }

  // prettier-ignore
  identity() {
		return this.set(
			1, 0, 0, 0,
			0, 1, 0, 0,
			0, 0, 1, 0,
			0, 0, 0, 1
		);
	}

  translate(x, y, z) {
    this[12] = x;
    this[13] = y;
    this[14] = z;
    return this;
  }

  // prettier-ignore
  transpose () {
		var te = this;
		var tmp;

		tmp = te[ 1 ]; te[ 1 ] = te[ 4 ]; te[ 4 ] = tmp;
		tmp = te[ 2 ]; te[ 2 ] = te[ 8 ]; te[ 8 ] = tmp;
		tmp = te[ 6 ]; te[ 6 ] = te[ 9 ]; te[ 9 ] = tmp;

		tmp = te[ 3 ]; te[ 3 ] = te[ 12 ]; te[ 12 ] = tmp;
		tmp = te[ 7 ]; te[ 7 ] = te[ 13 ]; te[ 13 ] = tmp;
		tmp = te[ 11 ]; te[ 11 ] = te[ 14 ]; te[ 14 ] = tmp;

		return this;
	}

  // prettier-ignore
  compose(position, quaternion, scale) {
		const te = this;

		const x = quaternion[0], y = quaternion[1], z = quaternion[2], w = quaternion[3];
		const x2 = x + x,	y2 = y + y, z2 = z + z;
		const xx = x * x2, xy = x * y2, xz = x * z2;
		const yy = y * y2, yz = y * z2, zz = z * z2;
		const wx = w * x2, wy = w * y2, wz = w * z2;

		const sx = scale[0], sy = scale[1], sz = scale[2];

		te[ 0 ] = ( 1 - ( yy + zz ) ) * sx;
		te[ 1 ] = ( xy + wz ) * sx;
		te[ 2 ] = ( xz - wy ) * sx;
		te[ 3 ] = 0;

		te[ 4 ] = ( xy - wz ) * sy;
		te[ 5 ] = ( 1 - ( xx + zz ) ) * sy;
		te[ 6 ] = ( yz + wx ) * sy;
		te[ 7 ] = 0;

		te[ 8 ] = ( xz + wy ) * sz;
		te[ 9 ] = ( yz - wx ) * sz;
		te[ 10 ] = ( 1 - ( xx + yy ) ) * sz;
		te[ 11 ] = 0;

		te[ 12 ] = position[0];
		te[ 13 ] = position[1];
		te[ 14 ] = position[2];
		te[ 15 ] = 1;

		return this;

	}

  // prettier-ignore
  rotate(x, y, z) {
    const te = this;

		const a = Math.cos( x ), b = Math.sin( x );
		const c = Math.cos( y ), d = Math.sin( y );
		const e = Math.cos( z ), f = Math.sin( z );

    const ae = a * e, af = a * f, be = b * e, bf = b * f;

    te[ 0 ] = c * e;
    te[ 4 ] = - c * f;
    te[ 8 ] = d;

    te[ 1 ] = af + be * d;
    te[ 5 ] = ae - bf * d;
    te[ 9 ] = - b * c;

    te[ 2 ] = bf - ae * d;
    te[ 6 ] = be + af * d;
    te[ 10 ] = a * c;

    return this;
  }

  // prettier-ignore
  invert() {
    // based on http://www.euclideanspace.com/maths/algebra/matrix/functions/inverse/fourD/index.htm
		const te = this,

      n11 = te[ 0 ], n21 = te[ 1 ], n31 = te[ 2 ], n41 = te[ 3 ],
      n12 = te[ 4 ], n22 = te[ 5 ], n32 = te[ 6 ], n42 = te[ 7 ],
      n13 = te[ 8 ], n23 = te[ 9 ], n33 = te[ 10 ], n43 = te[ 11 ],
      n14 = te[ 12 ], n24 = te[ 13 ], n34 = te[ 14 ], n44 = te[ 15 ],

      t11 = n23 * n34 * n42 - n24 * n33 * n42 + n24 * n32 * n43 - n22 * n34 * n43 - n23 * n32 * n44 + n22 * n33 * n44,
      t12 = n14 * n33 * n42 - n13 * n34 * n42 - n14 * n32 * n43 + n12 * n34 * n43 + n13 * n32 * n44 - n12 * n33 * n44,
      t13 = n13 * n24 * n42 - n14 * n23 * n42 + n14 * n22 * n43 - n12 * n24 * n43 - n13 * n22 * n44 + n12 * n23 * n44,
      t14 = n14 * n23 * n32 - n13 * n24 * n32 - n14 * n22 * n33 + n12 * n24 * n33 + n13 * n22 * n34 - n12 * n23 * n34;

    const det = n11 * t11 + n21 * t12 + n31 * t13 + n41 * t14;

    if ( det === 0 ) return this.fill( 0 );

    const detInv = 1 / det;

    te[ 0 ] = t11 * detInv;
    te[ 1 ] = ( n24 * n33 * n41 - n23 * n34 * n41 - n24 * n31 * n43 + n21 * n34 * n43 + n23 * n31 * n44 - n21 * n33 * n44 ) * detInv;
    te[ 2 ] = ( n22 * n34 * n41 - n24 * n32 * n41 + n24 * n31 * n42 - n21 * n34 * n42 - n22 * n31 * n44 + n21 * n32 * n44 ) * detInv;
    te[ 3 ] = ( n23 * n32 * n41 - n22 * n33 * n41 - n23 * n31 * n42 + n21 * n33 * n42 + n22 * n31 * n43 - n21 * n32 * n43 ) * detInv;

    te[ 4 ] = t12 * detInv;
    te[ 5 ] = ( n13 * n34 * n41 - n14 * n33 * n41 + n14 * n31 * n43 - n11 * n34 * n43 - n13 * n31 * n44 + n11 * n33 * n44 ) * detInv;
    te[ 6 ] = ( n14 * n32 * n41 - n12 * n34 * n41 - n14 * n31 * n42 + n11 * n34 * n42 + n12 * n31 * n44 - n11 * n32 * n44 ) * detInv;
    te[ 7 ] = ( n12 * n33 * n41 - n13 * n32 * n41 + n13 * n31 * n42 - n11 * n33 * n42 - n12 * n31 * n43 + n11 * n32 * n43 ) * detInv;

    te[ 8 ] = t13 * detInv;
    te[ 9 ] = ( n14 * n23 * n41 - n13 * n24 * n41 - n14 * n21 * n43 + n11 * n24 * n43 + n13 * n21 * n44 - n11 * n23 * n44 ) * detInv;
    te[ 10 ] = ( n12 * n24 * n41 - n14 * n22 * n41 + n14 * n21 * n42 - n11 * n24 * n42 - n12 * n21 * n44 + n11 * n22 * n44 ) * detInv;
    te[ 11 ] = ( n13 * n22 * n41 - n12 * n23 * n41 - n13 * n21 * n42 + n11 * n23 * n42 + n12 * n21 * n43 - n11 * n22 * n43 ) * detInv;

    te[ 12 ] = t14 * detInv;
    te[ 13 ] = ( n13 * n24 * n31 - n14 * n23 * n31 + n14 * n21 * n33 - n11 * n24 * n33 - n13 * n21 * n34 + n11 * n23 * n34 ) * detInv;
    te[ 14 ] = ( n14 * n22 * n31 - n12 * n24 * n31 - n14 * n21 * n32 + n11 * n24 * n32 + n12 * n21 * n34 - n11 * n22 * n34 ) * detInv;
    te[ 15 ] = ( n12 * n23 * n31 - n13 * n22 * n31 + n13 * n21 * n32 - n11 * n23 * n32 - n12 * n21 * n33 + n11 * n22 * n33 ) * detInv;

    return this;
  }

  multiply(m) {
    return this.multiplyMatrices(this, m);
  }

  // prettier-ignore
  multiplyMatrices( a, b ) {
    const ae = a;
    const be = b;
    const te = this;
  
    const a11 = ae[ 0 ], a12 = ae[ 4 ], a13 = ae[ 8 ], a14 = ae[ 12 ];
    const a21 = ae[ 1 ], a22 = ae[ 5 ], a23 = ae[ 9 ], a24 = ae[ 13 ];
    const a31 = ae[ 2 ], a32 = ae[ 6 ], a33 = ae[ 10 ], a34 = ae[ 14 ];
    const a41 = ae[ 3 ], a42 = ae[ 7 ], a43 = ae[ 11 ], a44 = ae[ 15 ];
  
    const b11 = be[ 0 ], b12 = be[ 4 ], b13 = be[ 8 ], b14 = be[ 12 ];
    const b21 = be[ 1 ], b22 = be[ 5 ], b23 = be[ 9 ], b24 = be[ 13 ];
    const b31 = be[ 2 ], b32 = be[ 6 ], b33 = be[ 10 ], b34 = be[ 14 ];
    const b41 = be[ 3 ], b42 = be[ 7 ], b43 = be[ 11 ], b44 = be[ 15 ];
  
    te[ 0 ] = a11 * b11 + a12 * b21 + a13 * b31 + a14 * b41;
    te[ 4 ] = a11 * b12 + a12 * b22 + a13 * b32 + a14 * b42;
    te[ 8 ] = a11 * b13 + a12 * b23 + a13 * b33 + a14 * b43;
    te[ 12 ] = a11 * b14 + a12 * b24 + a13 * b34 + a14 * b44;
  
    te[ 1 ] = a21 * b11 + a22 * b21 + a23 * b31 + a24 * b41;
    te[ 5 ] = a21 * b12 + a22 * b22 + a23 * b32 + a24 * b42;
    te[ 9 ] = a21 * b13 + a22 * b23 + a23 * b33 + a24 * b43;
    te[ 13 ] = a21 * b14 + a22 * b24 + a23 * b34 + a24 * b44;
  
    te[ 2 ] = a31 * b11 + a32 * b21 + a33 * b31 + a34 * b41;
    te[ 6 ] = a31 * b12 + a32 * b22 + a33 * b32 + a34 * b42;
    te[ 10 ] = a31 * b13 + a32 * b23 + a33 * b33 + a34 * b43;
    te[ 14 ] = a31 * b14 + a32 * b24 + a33 * b34 + a34 * b44;
  
    te[ 3 ] = a41 * b11 + a42 * b21 + a43 * b31 + a44 * b41;
    te[ 7 ] = a41 * b12 + a42 * b22 + a43 * b32 + a44 * b42;
    te[ 11 ] = a41 * b13 + a42 * b23 + a43 * b33 + a44 * b43;
    te[ 15 ] = a41 * b14 + a42 * b24 + a43 * b34 + a44 * b44;
  
    return this;
  
  }
}

export class Vector3 extends Array {
  constructor() {
    super(3);
    this.fill(0);
  }
}

export class Quaternion extends Array {
  constructor() {
    super(4);
    this[0] = 0;
    this[1] = 0;
    this[2] = 0;
    this[3] = 1;
  }

  setFromEuler(euler, order = 'XYZ') {
    const x = euler[0],
      y = euler[1],
      z = euler[2];

    // http://www.mathworks.com/matlabcentral/fileexchange/
    // 	20696-function-to-convert-between-dcm-euler-angles-quaternions-and-euler-vectors/
    //	content/SpinCalc.m

    const cos = Math.cos;
    const sin = Math.sin;

    const c1 = cos(x / 2);
    const c2 = cos(y / 2);
    const c3 = cos(z / 2);

    const s1 = sin(x / 2);
    const s2 = sin(y / 2);
    const s3 = sin(z / 2);

    switch (order) {
      case 'XYZ':
        this[0] = s1 * c2 * c3 + c1 * s2 * s3;
        this[1] = c1 * s2 * c3 - s1 * c2 * s3;
        this[2] = c1 * c2 * s3 + s1 * s2 * c3;
        this[3] = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case 'YXZ':
        this[0] = s1 * c2 * c3 + c1 * s2 * s3;
        this[1] = c1 * s2 * c3 - s1 * c2 * s3;
        this[2] = c1 * c2 * s3 - s1 * s2 * c3;
        this[3] = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      case 'ZXY':
        this[0] = s1 * c2 * c3 - c1 * s2 * s3;
        this[1] = c1 * s2 * c3 + s1 * c2 * s3;
        this[2] = c1 * c2 * s3 + s1 * s2 * c3;
        this[3] = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case 'ZYX':
        this[0] = s1 * c2 * c3 - c1 * s2 * s3;
        this[1] = c1 * s2 * c3 + s1 * c2 * s3;
        this[2] = c1 * c2 * s3 - s1 * s2 * c3;
        this[3] = c1 * c2 * c3 + s1 * s2 * s3;
        break;
      case 'YZX':
        this[0] = s1 * c2 * c3 + c1 * s2 * s3;
        this[1] = c1 * s2 * c3 + s1 * c2 * s3;
        this[2] = c1 * c2 * s3 - s1 * s2 * c3;
        this[3] = c1 * c2 * c3 - s1 * s2 * s3;
        break;
      case 'XZY':
        this[0] = s1 * c2 * c3 - c1 * s2 * s3;
        this[1] = c1 * s2 * c3 - s1 * c2 * s3;
        this[2] = c1 * c2 * s3 + s1 * s2 * c3;
        this[3] = c1 * c2 * c3 + s1 * s2 * s3;
        break;
    }

    return this;
  }
}

export function isPowerOfTwo(n) {
  return (n & (n - 1)) === 0 && n !== 0;
}

export function normalize(vec) {
  let sum = 0;
  for (let i = 0; i < vec.length; i++) {
    sum += vec[i] * vec[i];
  }
  sum = Math.sqrt(sum);
  for (let i = 0; i < vec.length; i++) {
    vec[i] /= sum;
  }
  return vec;
}

export function toRad(deg) {
  return (deg * Math.PI) / 180;
}

export function toDeg(rad) {
  return (rad * 180) / Math.PI;
}
