import * as firebase from 'firebase/app';

import 'firebase/auth';
import 'firebase/firestore';

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
        const missing = ['apiKey', 'authDomain', 'projectId', 'appId']
            .filter((key) => !this.firebaseConfig[key]);
        if (missing.length) {
            throw new Error(
                `Firebase is not configured (missing ${missing.join(', ')}). ` +
                'Copy .env.example to .env.local and fill in your Firebase web app config.',
            );
        }
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
        return firebase.auth().onAuthStateChanged(callback);
    }

    // Resolves once with the current user (or null) after Firebase restores the session.
    public getAuthUser = () => {
        return new Promise((resolve, reject) => {
            const unsubscribe = firebase.auth().onAuthStateChanged((user: any) => {
                unsubscribe();
                resolve(user);
            }, reject);
        });
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

    public signUpWithFacebook = () => {
        return this.signInWithFacebook();
    }

    public signUpWithGoogle = () => {
        return this.signInWithGoogle();
    }

    // Popup instead of redirect: browsers that partition third-party storage
    // (Chrome 115+, Safari 16.1+, Firefox 109+) break signInWithRedirect when the
    // app is not served from the authDomain.
    public signInWithFacebook = () => {
        const provider = new firebase.auth.FacebookAuthProvider();
        return firebase.auth().signInWithPopup(provider);
    }
    public signInWithGoogle = () => {
        const provider = new firebase.auth.GoogleAuthProvider();
        return firebase.auth().signInWithPopup(provider);
    }

    public signOut = () => {
        return firebase.auth().signOut();
    }

    public getUser = () => {
        return firebase.auth().currentUser;
    }
}

export default FirebaseWeb;
