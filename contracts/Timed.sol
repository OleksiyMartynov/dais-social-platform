pragma solidity ^0.5.8;
interface Timed{
    modifier onlyBefore(uint _time) {
        require(
            now < _time,
            "Function called too late."
        );
        _;
    }
    
    modifier onlyAfter(uint _time) {
        require(
            now >= _time,
            "Function called too early."
        );
        _;
    }
}