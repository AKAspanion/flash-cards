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

    public fetchAllFlashCardSetsByUID = (user: any) => {
        const flashCardSetRef = firebase.firestore().collection('flash-card-sets');
        return flashCardSetRef.where('uid', '==', user.uid).get();
    }

    public addFlashCardSet = (user: any, cardSet: any) => {
        const flashCardSetRef = firebase.firestore().collection('flash-card-sets');
        return flashCardSetRef.add({
            ...cardSet,
            uid: user.uid,
            cards: JSON.stringify(cardSet.cards),
            labels: cardSet.labels,
        });
    }

    public updateFlashCardSet = (cardSet: any) => {
        const flashCardSetRef = firebase.firestore().collection('flash-card-sets').doc(cardSet.docId);
        return flashCardSetRef.update({
            ...cardSet,
            cards: JSON.stringify(cardSet.cards),
        });
    }

    public deleteFlashCardSet = (cardSet: any) => {
        const flashCardSetRef = firebase.firestore().collection('flash-card-sets').doc(cardSet.docId);
        return flashCardSetRef.delete();
    }

    public fetchAllLabelsByUID = (user: any) => {
        const labelRef = firebase.firestore().collection('labels');
        return labelRef.where('uid', '==', user.uid).get();
    }

    public addLabel = (user: any, label: any) => {
        const labelRef = firebase.firestore().collection('labels');
        return labelRef.add({
            label,
            uid: user.uid,
        });
    }
    public updateLabel = (label: any) => {
        const labelRef = firebase.firestore().collection('labels').doc(label.docId);
        return labelRef.update({
            ...label,
        });
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

    public signOut = () => {
        return firebase.auth().signOut();
    }

    public getUser = () => {
        return firebase.auth().currentUser;
    }
}

export default FirebaseWeb;
