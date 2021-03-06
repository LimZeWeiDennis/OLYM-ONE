import React, {useEffect, useState} from 'react';
import {
    Animated,
    View,
    Image,
    StyleSheet,
    FlatList,
    Keyboard,
    TouchableWithoutFeedback,
    Text,
    TouchableOpacity,
    Dimensions,
    Alert,
    TextInput,
} from 'react-native';
import {useNavigation} from "@react-navigation/native";
import SearchButtons from '../Components/SearchButtons';


import Background from "../views/Background";
import LocationSearchBar from "../Components/LocationSeachBar";
import FullGameItem from "../Components/FullGameItem";
import firebaseDb from "../firebaseDb";
import Styles from "../styling/Styles";
import GameDetailsModal from "../Components/GameDetailsModal";
import {noInput, noSport} from "../Components/NoDataMessages";
import {Entypo} from 'react-native-vector-icons';
import {Modal, Input} from "@ui-kitten/components";
import {Formik} from "formik";
import * as yup from "yup";
import {mrtStations} from "../Components/SearchBarFunctions";

const sHeight = Dimensions.get('window').height

const AnimatedFlatList = Animated.createAnimatedComponent(FlatList);

const reviewSchema = yup.object({
    sport: yup.string().label('Sport').required('Please input a sport!').test('not empty test', 'Please input a sport!',
        (sport) => sport !== '')
})

const GameScreen = (props) => {
    const navigation = useNavigation()

    //UID OF USER ================================================================================================
    const user = props.route.params.user
    const currentUser = user.id;

    // Array for available games ==============================================================================================
    const [game, setGame] = useState ([]);

    //UPDATING AND QUERYING OF OUTDATED GAME DETAILS ================================================================================================

    const gamesRef = firebaseDb.firestore().collection('game_details');
    const refApplRef = firebaseDb.firestore().collection('application_details');
    const playerApplRef = firebaseDb.firestore().collection('player_application_details');
    let listener = null

    useEffect(() => {
        // deleting of expired games
        const now = new Date().getTime() / 1000;
        gamesRef.where('date', '<', now)
            .get()
            .then(response => {
                let batch = firebaseDb.firestore().batch()
                response.docs.forEach((doc) => {
                    const docRef = gamesRef.doc(doc.id)
                    batch.delete(docRef)
                    deletePlayerAppl(doc.id)
                })
                batch.commit().catch(error => console.log(error))
            })
            .catch(error => console.log(error))
    }, [])

    const deletePlayerAppl = (gameId) => {
        const playerApplRef = firebaseDb.firestore().collection("player_application_details")
        playerApplRef.where('gameId', '==' , gameId)
            .get()
            .then(response => {
                let batch = firebaseDb.firestore().batch()
                response.docs.forEach((doc) => {
                    const docRef = applRef.doc(doc.id)
                    batch.delete(docRef)
                })
                batch.commit().catch(error => console.log(error))
            })
            .catch(error => console.log(error))
        const applRef = firebaseDb.firestore().collection("application_details")
          applRef.where('gameId', '==' , gameId)
              .get()
              .then(response => {
                  let batch = firebaseDb.firestore().batch()
                  response.docs.forEach((doc) => {
                      const docRef = applRef.doc(doc.id)
                      batch.delete(docRef)
                  })
                  batch.commit().catch(error => console.log(error))
              })
              .catch(error => console.log(error))
    }

    //ANIMATED COMPONENTS =========================================================================================
    const [x,setX] = useState(new Animated.Value(0));
    const onScroll = Animated.event([{ nativeEvent: {contentOffset: { x } } }],
        {useNativeDriver:true,
        });

    // ARRAY FOR SPORT SELECTION BELOW SEARCH BAR ==============================================================================
    const sports = ["Soccer", "BasketBall", "Floorball", "Badminton", "Tennis", "Others"];
    const [sportValue, setSportValue] = useState('');

    const [specificSport, setSpecificSport] = useState('');




    // IMAGE FOR RELATIVE SPORT =======================================================================================
    const sportImage = (sport) => {
        if(sport === "Soccer"){
            return require("../assets/soccer_coloured.png");
        } else if(sport === "BasketBall"){
            return require("../assets/basketball_coloured.png");
        } else if(sport === "Floorball"){
            return require("../assets/floorball_icon.png");
        } else if(sport === "Badminton"){
            return require("../assets/badminton_icon.png");
        } else if(sport === "Tennis"){
            return require("../assets/tennis_coloured.png");
        } else if(sport === "Others"){
            return require("../assets/other_games.png")
        }
    }

    // SEARCH BAR FUNCTIONS AND PARAMS ===========================================================================================
    const [zone, setZone] = useState('')
    const [searchedBefore, setSearchedBefore] = useState(false)

    const noFieldsSelected = () => Alert.alert(
        "No Fields selected!",
        "Please select a zone or location or both.",
        [
            {text:"Confirm", onPress: () => {},  style:'cancel'}
        ],
        {cancelable: false}
    )

    // searching function on pressing search or any of the sport ==============================================
    // will only go through when a valid zone is selected =============================
    const search = (sportValue) => {
        if (sportValue === '' && zone === '') {
            noFieldsSelected()
            return
        }
        if (listener !== null) {
            // unsubscribing from current listener
            listener()
        }
        if (sportValue !== '' && zone !== '') {
            listener = gamesRef
                            .orderBy("date", "asc")
                            .where('sport', '==', sportValue.toLowerCase())
                            .where('location', '==', zone)
                            .onSnapshot(documents => {
                                const now = new Date().getTime()
                                const filteredGames = []
                                documents.forEach( doc => {
                                    const d = doc.data();
                                    if(d.date.toMillis() < now){

                                        doc.ref.delete().then(()=>{}
                                        );
                                        deletePlayerAppl(doc.id);
                                    } else if(d.hostId === currentUser){}
                                    else if( parseInt(d.availability) <= 0){}
                                    else if(d.refereeList.includes(currentUser)){}
                                    else if(d.players.includes(currentUser)){}
                                    else if(d.applicants.includes(currentUser)){}
                                    else {
                                        filteredGames.push({key:doc.id, value:doc.data()});
                                    }
                                })
                                setGame(filteredGames)
                                setSearchedBefore(true)
                            } , err => {
                                console.log(err.message);
                            })
            return;
        }
        if (sportValue !== '') {
            listener = gamesRef
                            .orderBy("date", "asc")
                            .where('sport', '==', sportValue.toLowerCase())
                            .onSnapshot(documents => {
                                const now = new Date().getTime()
                                const filteredGames = []
                                documents.forEach( doc => {
                                        const d = doc.data();
                                        if(d.date.toMillis() < now){
                                            playerApplRef.where("gameId", "==", doc.id)
                                                .get()
                                                .then(snapShot => {
                                                    snapShot.forEach(value => {
                                                        value.ref.delete().then(()=>{});
                                                    })
                                                });
                                            refApplRef.where("gameId", "==", doc.id)
                                                .get()
                                                .then(snapShot => {
                                                    snapShot.forEach(value => {
                                                        value.ref.delete().then(()=>{});
                                                    })
                                                });
                                            doc.ref.delete().then(()=>{});

                                            deletePlayerAppl(doc.id)
                                        } else if(d.hostId === currentUser){}
                                        else if( parseInt(d.availability) <= 0){}
                                        else if(d.players.includes(currentUser)){}
                                        else if(d.refereeList.includes(currentUser)){}
                                        else if(d.applicants.includes(currentUser)){}
                                        else {
                                            filteredGames.push({key:doc.id, value:doc.data()});
                                        }
                                    }
                                )
                                setGame(filteredGames)
                                console.log(filteredGames.length)
                                setSearchedBefore(true)
                            }, err => {
                                console.log(err.message);
                            })
            return;
        }
        if (zone !== '') {
            listener = gamesRef
                            .orderBy("date", "asc")
                            .where('location', '==', zone)
                            .onSnapshot(documents => {
                                const now = new Date().getTime()
                                const filteredGames = []
                                documents.forEach( doc => {
                                        const d = doc.data();
                                        if(d.date.toMillis() < now){
                                            playerApplRef.where("gameId", "==", doc.id)
                                                .get()
                                                .then(snapShot => {
                                                    snapShot.forEach(value => {
                                                        value.ref.delete().then(()=>{});
                                                    })
                                                });
                                            refApplRef.where("gameId", "==", doc.id)
                                                .get()
                                                .then(snapShot => {
                                                    snapShot.forEach(value => {
                                                        value.ref.delete().then(()=>{});
                                                    })
                                                });
                                            doc.ref.delete().then(()=>{});
                                            deletePlayerAppl(doc.id)
                                        } else if(d.hostId === currentUser){}
                                        else if( parseInt(d.availability) <= 0){}
                                        else if(d.players.includes(currentUser)){}
                                        else if(d.refereeList.includes(currentUser)){}
                                        else if(d.applicants.includes(currentUser)){}
                                        else {
                                            filteredGames.push({key:doc.id, value:doc.data()});
                                        }
                                    }
                                )
                                setGame(filteredGames)
                                setSearchedBefore(true)
                            } , err => {
                                console.log(err.message);
                            })
        }
    }

    return (
        <TouchableWithoutFeedback onPress = {Keyboard.dismiss} accessible = {false}>
            <Background>
                <View style = {{top: Styles.statusBarHeight.height}}>
                    {/*==================================== Title and hosting a game ======================================*/}
                    <View style = {{justifyContent: 'space-between',height: sHeight * 0.08, width: '100%', flexDirection: 'row', alignItems: 'flex-end', paddingHorizontal:10}}>
                        <Text style = {styles.text}>Find Games</Text>
                        <View style = {{alignItems: 'center', justifyContent: 'center', flexDirection: 'row',}}>
                            <Text style = {{...styles.text, fontSize: 23, top: 2}}> Host </Text>
                            <TouchableOpacity style = {{backgroundColor: 'rgba(255,255,255,0.30)',alignItems: 'center', justifyContent: 'center', borderRadius: 5}}
                                              activeOpacity={ 0.9}
                                              onPress={() => {
                                                  navigation.navigate('HostGameScreen',
                                                      {
                                                          uid: currentUser,
                                                      }
                                                  )
                                              }}
                            >
                                <Entypo name="squared-plus" style = {{top: Platform.OS === 'ios' ? 1 : 0}}color={'white'} size={35}/>
                            </TouchableOpacity>
                        </View>
                    </View>


                    {/*==================================SEARCH BAR ==============================================*/}
                    <View style={styles.searchSpace}>
                        <LocationSearchBar select = {val => setZone(val)}
                                           onPress = {() => search(sportValue)}
                                           onChange = {() => setZone('')}
                        />
                    </View>
                    {/*===============================Sport Selection ===========================================*/}

                    <View style={{height: sHeight * 0.14}}>
                        <FlatList showsHorizontalScrollIndicator={false}
                                  horizontal={true}
                                  contentContainerStyle= {{justifyContent:"space-between"}}
                                  keyExtractor={(item) => item.toString()}
                                  data = {sports}
                                  renderItem= {({item}) =>
                                      item === sportValue
                                          ?
                                          <View style={styles.sportItem}>
                                              <TouchableOpacity activeOpacity={0.6}
                                                                style={{...styles.sportSelected}}
                                                                onPress ={ () => {
                                                                    console.log(item)
                                                                    setSportValue("");
                                                                    // search(item);
                                                                }}
                                              >
                                                  <View style={styles.sportImageSelected}>
                                                      <Image source={sportImage(item)} style={{width:37.5, height:37.5, resizeMode:"contain", opacity:1.0}}/>
                                                  </View>

                                              </TouchableOpacity>
                                              <Text>{item}</Text>
                                          </View>
                                          : <View style={styles.sportItem}>
                                              <TouchableOpacity activeOpacity={0.6}
                                                                style={{...styles.sportSelection}}
                                                                onPress ={() => {
                                                                    setSportValue(item);
                                                                    if (item !== 'Others') {
                                                                        search(item);
                                                                    }
                                                                }}
                                              >
                                                  <View style={styles.sportImageShadow}>
                                                      <Image source={sportImage(item)} style={{width:35, height:35, resizeMode:"contain", opacity:0.3}}/>
                                                  </View>

                                              </TouchableOpacity>
                                              <Text style={{opacity:0.3}}>{item}</Text>
                                          </View>
                                  }

                        >
                        </FlatList>
                    </View>

                <Formik
                    initialValues = {{
                        sport: ''
                    }}
                    validationSchema = {reviewSchema}
                    onSubmit={(values, actions) => {
                        search(values.sport)
                        setSportValue('')
                    }}
                >
                    {props =>
                        <Modal
                            visible={sportValue === "Others"}
                            backdropStyle={{backgroundColor: 'rgba(0, 0, 0, 0.5)',}}
                            onBackdropPress={() => setSportValue('')}>
                            <View style={{
                                backgroundColor: 'white',
                                height: 200,
                                width: 250,
                                borderRadius: 30,
                                justifyContent: 'center',
                                alignItems: 'center'
                            }}>
                                <Text style={{textAlign: 'center', fontSize: 18, bottom: 35}}>Enter name of
                                    sport:</Text>
                                <Input
                                    placeholder={"Eg. Cricket, Golf"}
                                    onChangeText={
                                        props.handleChange( 'sport')
                                    }
                                    onBlur = {props.handleBlur('sport')}
                                    value={props.values.sport}
                                    style={{width: '80%',}}
                                />
                                <Text style={{textAlign: 'center', fontSize: 15, color: 'red', bottom: 5}}>{props.touched.sport && props.errors.sport}</Text>
                                <View style={{
                                    position: 'absolute',
                                    width: '100%',
                                    bottom: 0,
                                    height: 50,
                                    borderBottomLeftRadiusRadius: 30,
                                    borderBottomRightRadius: 30,
                                    borderTopWidth: 0.5,
                                    flexDirection: 'row'
                                }}>
                                    <TouchableOpacity activeOpacity={0.8} style={{
                                        width: '50%',
                                        height: 50,
                                        borderBottomLeftRadiusRadius: 30,
                                        justifyContent: 'center',
                                        borderRightWidth: 0.5,
                                    }}
                                                      onPress={() => {
                                                          setSportValue('')
                                                      }}
                                    >
                                        <Text style={{textAlign: 'center', fontSize: 18,}}>Cancel</Text>
                                    </TouchableOpacity>
                                    <TouchableOpacity activeOpacity={0.8} style={{
                                        width: '50%', height: 50,
                                        borderBottomRightRadius: 30, justifyContent: 'center',
                                    }}
                                                      onPress={
                                                          props.handleSubmit
                                                          // search(specificSport)
                                                          // setSportValue('')
                                                      }
                                    >
                                        <Text style={{textAlign: 'center', fontSize: 18,}}>Search</Text>
                                    </TouchableOpacity>
                                </View>
                            </View>
                        </Modal>
                    }
                </Formik>

                <View style={{height:sHeight * 0.64, paddingVertical: '4%' }}>

                    {!searchedBefore
                        ? noInput
                        : game.length === 0
                                ? noSport
                                : <AnimatedFlatList
                                    scrollEventThrottle={16}
                                    {...{onScroll}}
                                    showsHorizontalScrollIndicator={false}
                                    horizontal={true}
                                    contentContainerStyle= {{ paddingHorizontal:"8.5%", alignItems:"center"}}
                                    keyExtractor={(item) => item.key.toString()}
                                    data = {game}
                                    renderItem= {({item, index}) => <FullGameItem gameDetails={item.value}
                                                                                  gameId={item.key}
                                                                                  user={user}
                                                                                  itemType={"Join"}
                                                                                  translateX = {x}
                                                                                  index = {index}
                                                                                  onPress ={() => {navigation.navigate('GameDetailsModal',
                                                                                      {
                                                                                          uid: currentUser,
                                                                                          gameDetails: item.value,
                                                                                          itemType: "Join",
                                                                                          user: user,
                                                                                          gameId: item.key,
                                                                                      })
                                                                                  }}


                                    />}
                                >

                                </AnimatedFlatList>
                    }

                    </View>
                </View>
            </Background>
        </TouchableWithoutFeedback>
    )
}

const styles = StyleSheet.create({
    searchSpace:{
        width:"96%",
        height: sHeight * 0.1,
        justifyContent: 'center',
        alignSelf: 'center'
    },
    sportItem:{
        flex:1,
        marginHorizontal:10,
        justifyContent:"flex-start",
        alignItems:"center",

    },
    sportSelection:{
        backgroundColor:'rgb(255,255,255)',
        elevation:10,
        borderRadius:15,
        height:70,
        width:100,
        justifyContent:"center",
        alignItems:"center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 2.27,

    },
    sportSelected:{
        backgroundColor:'rgb(239,195,144)',
        elevation:5,
        borderRadius:15,
        height:75,
        width:110,
        justifyContent:"center",
        alignItems:"center",
        shadowColor: "#000",
        shadowOffset: {
            width: 0,
            height: 2,
        },
        shadowOpacity: 0.2,
        shadowRadius: 2.27,
    },
    sportImageShadow:{
        width: 50,
        height: 50 ,
        borderRadius:27.5,
        backgroundColor:"transparent",
        alignItems:"center",
        paddingTop:7.5
    },
    sportImageSelected: {
        width: 50,
        height: 50,
        borderRadius: 27.5,
        backgroundColor: "transparent",
        alignItems: "center",
        paddingTop: 7
    },
    text: {
        color: 'white',
        fontSize: 27,
        fontWeight: "bold",
    },

    noApplication: {
        fontSize: 33,
        alignSelf: 'center',
        color: '#5a5959',
        top: 20,
        textAlign:'center',
        width: Dimensions.get('window').width * 0.8
    },
    dropDown: {
        flexDirection:"row",
        justifyContent: 'center',
        alignItems:"center",
        alignSelf: 'center',
        backgroundColor: 'ghostwhite',
        height: 40,
        borderWidth: 1,
        borderRadius:4,
        borderColor:"rgba(131,137,147,0.53)",
        width: "96%",
    },
    dropDownText: {
        flexDirection:"row",
        justifyContent: 'center',
        alignItems:"center",
        height: 40,
        width: "97%",
    },

})

export default GameScreen;
