import jwt from 'jsonwebtoken';
// 随便打的一个字符串
const secret = 'dfgsaiugifdsgiu';
// 生成token
const generateToken = (e: string | number) => {
    let paylode = {
        id: e,
        time: Date.now(),
    };
    // 存放时间是一个月
    let token = jwt.sign(paylode, secret, { expiresIn: 60 * 60 * 24 * 30 })
    return token
};

// 解码token
const verifyToken = (token: string) => {
    // let paylode: boolean = false;
    // jwt.verify(token, secret, (err, result) => {
    //     if (err) {
    //         paylode = false;
    //     } else {
    //         paylode = true;
    //     }
    // });
    // return paylode;
    try{
        return jwt.verify(token,secret) as {id:string|number; time:number};
    }catch{
        return null;
    }
}
const jwtToken = { generateToken, verifyToken }
export default jwtToken