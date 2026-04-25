const generateOTP = (): number => {
  return Math.floor(1000 + Math.random() * 9000);
};

export default generateOTP;
