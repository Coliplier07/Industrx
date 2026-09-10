import { Text, View,SafeAreaView,StyleSheet,Image, TextInput,TouchableOpacity, ActivityIndicator } from "react-native";
import { Link, useRouter } from "expo-router";
import React, { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";



// 1. Define the "Shape" of the props for TypeScript
interface MenuButtonProps {
  title: string;
  onPress: () => void;
  color: string;
}

// 2. The Button Component (placed OUTSIDE the main Home function)
const MenuButton = ({ title, onPress, color }: MenuButtonProps) => (
  <TouchableOpacity
    style={[styles.button, { backgroundColor: color, borderColor: color }]}
    onPress={onPress}
  >
    <Text style={styles.buttonText}>{title}</Text>
  </TouchableOpacity>
);

const Home = () => {
  const router = useRouter();
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      if (session) {
        router.replace("/(dashboard)/jobs");
      } else {
        setCheckingSession(false);
      }
    });
  }, []);

  if (checkingSession) {
    return (
      <SafeAreaView style={{ flex: 1, backgroundColor: '#eBecf4', justifyContent: 'center' }}>
        <ActivityIndicator size="large" color="#075eec" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={{ flex: 1, backgroundColor: '#eBecf4' }}>
      <View style={styles.container}>
        <Image
          source={{ uri: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fi.pinimg.com%2F736x%2F91%2F99%2Fea%2F9199ea3ba9afea2b28c2af622dbba19d.jpg&f=1&nofb=1&ipt=0a409ec9543cf3a08ff2c02758278fa053a427334994de7fe2352a0dc0b97231' }}
          style={styles.headerImg}
        />

        <View style={styles.header}>
          <Text style={styles.title}>Welcome to IronClad</Text>
        </View>

        <View style={styles.formAction}>
          <Link href="/(auth)/login" asChild>
            <TouchableOpacity style={styles.button}>
              <Text style={styles.buttonText}>Login</Text>
            </TouchableOpacity>
          </Link>

          <Link href="/(auth)/create" asChild>
            <TouchableOpacity style={{ marginTop: 20 }}>
              <Text style={styles.subtitle}>Create an Account</Text>
            </TouchableOpacity>
          </Link>
        </View>
      </View>
    </SafeAreaView>
  );
};

export default Home;



const styles= StyleSheet.create({
  container:{
    padding: 70,
    flex:1
  },
  header:{
    marginVertical: 80,
    
  },

  headerImg: {
    width: 80,
    height:80,
    alignSelf: 'center',
    marginBottom: 36,

  },
  title:{
    fontSize: 27,
    fontWeight: '700',
    color: '#1e1e1e',
    marginBottom: 6,
    textAlign: 'center',
    padding: 24,

  },
  subtitle:{
    fontSize: 15,
    fontWeight: '500',
    color: '#929292',
    marginBottom: 5,
    textAlign: 'center',
    padding: 40
    ,

  },
  input:{},
  inputLabel:{
    fontSize: 17,
    fontWeight:'600',
    color: '#222',
    textAlign: 'left',
    padding: 12,
   

  },

  inputControl:{

    backgroundColor: '#fff',
    paddingVertical:10,
    paddingHorizontal:16,
    borderRadius: 12,
    fontSize: 15,
    fontWeight:'500',
    color: '#222',

  },

  form: {
    marginBottom: 24,
    flex: 1,
  },

  formAction:{
    marginVertical: 24,
  },

  button: {
    backgroundColor: '#075eec',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#075eec',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    alignSelf: 'center',
    color: '#fff',

  },

  button2: {
    backgroundColor: '#075eec',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#075eec',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 10,
    paddingHorizontal: 20,
  },
  buttonText2: {
    fontSize: 18,
    fontWeight: '600',
    alignSelf: 'center',
    color: '#fff',

  }

})
