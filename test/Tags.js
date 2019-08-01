const Tags = artifacts.require("Tags");
const Settings = artifacts.require("Settings");
const { KEY_ADDRESS_DEBATES } = require("../constants");

contract("Tags", accounts => {
    const MOCK_CALLER = accounts[0];
    const MOCK_TOPIC_1 = "TOPIC_1";
    const MOCK_TOPIC_2 = "TOPIC_2";
    const MOCK_IDS_GROUP_1 = [1,3,5,7,9];
    const MOCK_IDS_GROUP_2 = [0,2,4,6,8];
    const MOCK_TOPICS = ["TOPIC_3", "TOPIC_4", "TOPIC_5", "TOPIC_6", "TOPIC_7", "TOPIC_8", "TOPIC_9", "TOPIC_10", "TOPIC_11", "TOPIC_12", "TOPIC_13", "TOPIC_14", "TOPIC_15", "TOPIC_16"];
    it("should not be able to add tag without permission", async()=>{
        let failed = false;
        try{
            let meta = await Tags.deployed();
            await meta.addIdWithTag("topic", 1, {from: MOCK_CALLER});
        }catch(ex){
            failed = true;
        }
        assert(failed, "Transaction should fail");
    })
    it("should be able to add single tag", async()=>{
        const tag = "topic";
        const id = 100;
        let meta = await Tags.deployed();
        let settings = await Settings.deployed();
        await settings.setAddressValue(KEY_ADDRESS_DEBATES, MOCK_CALLER );
        await meta.addIdWithTag(tag, id, {from: MOCK_CALLER});
        let idsCount = await meta.getIdsCountForTag(tag);
        assert.equal(idsCount, 1, "ids count didnt match expected");
        let idsResponse = await meta.getIdsForTag(tag, 0, 10);
        assert.equal(idsResponse.values[0], id, "id returned didnt match expected");
    })
    it("should be able to add multiple tags and multiple ids", async()=>{
        let meta = await Tags.deployed();
        for(let i = 0; i < MOCK_IDS_GROUP_1.length; i++){
            const tag = MOCK_TOPIC_1;
            const id = MOCK_IDS_GROUP_1[i];
            await meta.addIdWithTag(tag, id, {from: MOCK_CALLER});
            let idsCount = await meta.getIdsCountForTag(tag);
            assert.equal(idsCount, i+1, "ids count didnt match expected");
            let idsResponse = await meta.getIdsForTag(tag, 0, 10);
            assert.equal(idsResponse.values[i], id, "id returned didnt match expected");
        }
        for(let i = 0; i < MOCK_IDS_GROUP_2.length; i++){
            const tag = MOCK_TOPIC_2;
            const id = MOCK_IDS_GROUP_2[i];
            await meta.addIdWithTag(tag, id, {from: MOCK_CALLER});
            let idsCount = await meta.getIdsCountForTag(tag);
            assert.equal(idsCount, i+1, "ids count didnt match expected");
            let idsResponse = await meta.getIdsForTag(tag, 0, 10);
            assert.equal(idsResponse.values[i], id, "id returned didnt match expected");
        }
    })
    it("should not be able to add tags that dont meet the length or format requirements", async()=>{
        let failed = false;
        try{
            let meta = await Tags.deployed();
            await meta.addIdWithTag("a", 1, {from: MOCK_CALLER});
        }catch(ex){
            failed = true;
        }
        assert(failed, "Transaction should fail");
        failed = false;
        try{
            let meta = await Tags.deployed();
            await meta.addIdWithTag("0123456789012345678901234567890123", 1, {from: MOCK_CALLER});
        }catch(ex){
            failed = true;
        }
        assert(failed, "Transaction should fail");
        failed = false;
        try{
            let meta = await Tags.deployed();
            await meta.addIdWithTag("#yolo", 1, {from: MOCK_CALLER});
        }catch(ex){
            failed = true;
        }
        assert(failed, "Transaction should fail");
    })
})