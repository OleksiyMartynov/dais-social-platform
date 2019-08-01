
const getGasCost = async (txInfo) => {
    const tx = await web3.eth.getTransaction(txInfo.tx);
    return  tx.gasPrice * txInfo.receipt.gasUsed;
}
const waitFor =  (time) => new Promise(resolve => setTimeout(() => { resolve(); }, time));

module.exports = { getGasCost, waitFor}