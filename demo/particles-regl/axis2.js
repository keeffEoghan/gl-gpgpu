import { setC2 } from '@thi.ng/vectors/setc';

const { sin, cos } = Math;

export const axis2 = (a, to = []) => setC2(to, cos(a), sin(a));

export default axis2;
