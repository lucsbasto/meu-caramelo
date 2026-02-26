import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { MapScreen } from '../screens/MapScreen';
import { PointsScreen } from '../screens/PointsScreen';

export type RootTabParamList = {
  Mapa: undefined;
  Pontos: undefined;
};

const Tab = createBottomTabNavigator<RootTabParamList>();

export function AppNavigator() {
  return (
    <Tab.Navigator
      screenOptions={{
        headerTitleAlign: 'center'
      }}
    >
      <Tab.Screen name="Mapa" component={MapScreen} />
      <Tab.Screen name="Pontos" component={PointsScreen} />
    </Tab.Navigator>
  );
}
