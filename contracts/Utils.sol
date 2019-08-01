pragma solidity ^0.5.8;

library Utils {
    function getPage(uint[] storage array, uint cursor, uint pageSize)
        internal
        view
        returns(uint[] memory values, uint newCurrsor)
    {
        uint length = pageSize;
        if (length > array.length - cursor) {
            length = array.length - cursor;
        }

        values = new uint[](length);
        for (uint256 i = 0; i < length; i++) {
            values[i] = array[cursor + i];
        }

        return (values, cursor + length);
    }
    function getPageStrings(string[] storage array, uint cursor, uint pageSize)
        internal
        view
        returns(string[] memory values, uint newCurrsor)
    {
        uint length = pageSize;
        if (length > array.length - cursor) {
            length = array.length - cursor;
        }

        values = new string[](length);
        for (uint256 i = 0; i < length; i++) {
            values[i] = array[cursor + i];
        }

        return (values, cursor + length);
    }
    function stringStartsWith(string memory str, bytes1 char)
        internal
        pure
    returns (bool)
    {
        bytes memory raw = bytes(str);
        return raw[0] == char;
    }
    function utfStringLength(string memory str)
        internal
        pure
    returns (uint length)
    {
        uint i = 0;
        bytes memory string_rep = bytes(str);

        while (i<string_rep.length)
        {
            if (uint8(string_rep[i])>>7==0)
                i += 1;
            else if (uint8(string_rep[i])>>5==0x6)
                i += 2;
            else if (uint8(string_rep[i])>>4==0xE)
                i += 3;
            else if (uint8(string_rep[i])>>3==0x1E)
                i += 4;
            else
                //For safety
                i += 1;

            length++;
        }
    }
}