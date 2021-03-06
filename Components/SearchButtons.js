import React from 'react';
import {View, TouchableOpacity} from 'react-native';

import MaterialCommunityIcons from 'react-native-vector-icons/MaterialCommunityIcons';


const SearchButtons = props => {
    return (
        <View style={{elevation:5}}>
            <TouchableOpacity style={{elevation:5, ...props.style}} onPress={props.searchMe}>
                <MaterialCommunityIcons name="magnify" size={25} style={{color:"#414141"}}/>
            </TouchableOpacity>
        </View>
    )
}


export default SearchButtons
