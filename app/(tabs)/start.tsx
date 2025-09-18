import React from 'react';
import { View, Text, TouchableOpacity } from 'react-native';
import { router } from 'expo-router';
export default function Start(){
  return (
    <View style={{flex:1,alignItems:'center',justifyContent:'center',gap:12}}>
      <Text style={{fontSize:20,fontWeight:'700'}}>Начало</Text>
      <TouchableOpacity onPress={()=>router.push('/incomes')} style={{padding:12,borderWidth:1,borderRadius:10}}>
        <Text>Започни</Text>
      </TouchableOpacity>
      <TouchableOpacity onPress={()=>router.push('/incomes')} style={{padding:12,borderWidth:1,borderRadius:10}}>
        <Text>Импорт CSV</Text>
      </TouchableOpacity>
    </View>
  );
}
