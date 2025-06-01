require("@nomicfoundation/hardhat-toolbox");

/** @type import('hardhat/config').HardhatUserConfig */
module.exports = {
  solidity: {
    compilers: [
      { version: "0.8.19" },
      { version: "0.8.28" } // Add compiler for Lock.sol
    ]
  },
  networks: {
    geth: {
      url: "http://127.0.0.1:8888", // Your Geth node RPC URL
      accounts: [
        "b3485c49bd73808b310c853e6dccffc56f14ef7b4e032d2c5cb38e88368ae432" // 这是你的 Geth 管理员账户的私钥
      ],
    },
  },
};
