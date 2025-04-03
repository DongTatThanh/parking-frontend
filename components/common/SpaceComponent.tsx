import { View, Text } from 'react-native'
import React from 'react'
interface Props {
    width:number ,
    height :number,
}

const SpaceComponents = (props: Props) => {
    const {width , height}= props;
  return (
  <View 
  style ={{
    width,
    height,
  }}
  />
  )
};

export default SpaceComponents;