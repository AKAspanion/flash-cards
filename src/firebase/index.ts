import * as firebase from 'firebase';
import store from '@/store';

class FirebaseWeb {
    private firebaseConfig: any = {
        apiKey: process.env.VUE_APP_API_KEY,
        authDomain: process.env.VUE_APP_AUTH_DOMAIN,
        databaseURL: process.env.VUE_APP_DATABASE_URL,
        projectId: process.env.VUE_APP_PROJECT_ID,
        storageBucket: process.env.VUE_APP_STORAGE_BUCKET,
        messagingSenderId: process.env.VUE_APP_MESSAGING_SENDER_ID,
        appId: process.env.VUE_APP_APP_ID,
        measurementId: process.env.VUE_APP_MEASUREMENT_ID,
    };

    public isAppInitialized() {
        return firebase.apps.length;
    }

    public initializeFirebase = () => {
        firebase.initializeApp(this.firebaseConfig);
    }

    public authChangeListener(callback: any) {
        firebase.auth().onAuthStateChanged(callback);
    }

    public updateUserProfile = (updatedUser: any) => {
        const user: any = firebase.auth().currentUser;
        return user.updateProfile({ ...updatedUser });
    }

    public signInWithEmail = (user: any) => {
        return firebase.auth().signInWithEmailAndPassword(user.email.trim(), user.password.trim());
    }

    public signUpWithEmail = (user: any) => {
        return firebase.auth().createUserWithEmailAndPassword(user.email.trim(), user.password.trim());
    }

    public getUser = () => {
        return firebase.auth().currentUser;
    }
}

export default FirebaseWeb;
