import { Text, View,SafeAreaView,StyleSheet,Image, TextInput,TouchableOpacity } from "react-native";
import React,{useState} from "react";
import { NavigationContainer } from '@react-navigation/native';
import { useRouter } from "expo-router";



function Login() {
  const router = useRouter(); // Initialize the router
  
  const [form, setForm] = useState({
    email: '',
    password: '',
  });

  const handleSignIn = () => {
    // 3. Validation Logic (Optional for now)
    if (form.email && form.password) {
      console.log("Logging in...");

      // 4. THE CONNECTION:
      // We use .replace so the PM cannot "go back" to the login screen 
      // after they have already accessed the dashboard.
      router.replace("/jobs");
    } else {
      alert("Please enter credentials");
    }
  };

  // ... rest of your return code stays the same
  // Just ensure your TouchableOpacity calls handleSignIn

  return  (
    //Styles for Image
    <SafeAreaView style={{flex: 1, backgroundColor:'#eBecf4' }}>
      <View style ={styles.container}>
        <View style={styles.header}>
          <Image
            source={{ uri: 'https://external-content.duckduckgo.com/iu/?u=https%3A%2F%2Fi.pinimg.com%2F736x%2F91%2F99%2Fea%2F9199ea3ba9afea2b28c2af622dbba19d.jpg&f=1&nofb=1&ipt=0a409ec9543cf3a08ff2c02758278fa053a427334994de7fe2352a0dc0b97231'}}
            style={styles.headerImg}
            alt="logo "
            />

          <Text style = {styles.title}>Sign in to IronClad</Text>

          <Text style = {styles.subtitle}>Get access to job information</Text>




        </View>
        <View style={styles.form}>
          <View style={styles.input}>
            <Text style={styles.inputLabel}>Email Address:</Text>

            <TextInput
              autoCapitalize="none"
              autoCorrect={false}
              keyboardType="email-address"
              style={styles.inputControl}
              placeholder="yourEmail@gmail.com"
              placeholderTextColor="#6b7280"
              value={form.email}
              onChangeText={email => setForm({ ...form, email })}
              />
          </View>
          <View style={styles.input}>
            <Text style={styles.inputLabel}>Password:</Text>
            <TextInput
              secureTextEntry
              style={styles.inputControl}
              placeholder="********"
              placeholderTextColor="#6b7280"
              value={form.password}
              onChangeText={password => setForm({ ...form, password })}
            />
          </View>
          <TouchableOpacity onPress={handleSignIn}>
            
        <View style={styles.button}>
          <Text style={styles.buttonText}>Sign in</Text>
        </View>
      </TouchableOpacity>
    </View>





          </View>








    
      




      




    </SafeAreaView>
  );
}

export default Login;

const styles= StyleSheet.create({
  container:{
    padding: 24,
    flex:1
  },
  header:{
    marginVertical: 36,
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

  },
  subtitle:{
    fontSize: 15,
    fontWeight: '500',
    color: '#929292',
    marginBottom: 5,
    textAlign: 'center',

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
    marginVertical: 24,
  },
  buttonText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#fff',

  }

})