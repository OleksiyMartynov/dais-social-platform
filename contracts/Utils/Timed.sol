pragma solidity ^0.5.8;
/**
* @dev Contract module which provides time resticted function modifiers
*/
interface Timed{
    /**
     * @dev Throws if called after `_time` timestamp
     */
    modifier onlyBefore(uint _time) {
        require(
            now < _time,
            "Function called too late."
        );
        _;
    }

    /**
     * @dev Throws if called before `_time` timestamp
     */
    modifier onlyAfter(uint _time) {
        require(
            now >= _time,
            "Function called too early."
        );
        _;
    }
}