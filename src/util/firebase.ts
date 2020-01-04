import FirebaseWeb from '../firebase';
const firebase = new FirebaseWeb();

export const fetchAllFlashCardSets = (user: any) => {
    return new Promise((resolve, reject) => {
        firebase
            .fetchAllFlashCardSetsByUID(user)
            .then((snapshot: any) => {
                return parseAllFlashCardSets(snapshot);
            })
            .then((sets) => {
                resolve(sets);
            })
            .catch((err) => {
                console.log(err);
                reject('Error getting flash cards. Please try later!');
            });
    });
};

const parseAllFlashCardSets = (snapshot: any) => {
    const sets: any = [];
    return new Promise((resolve) => {
        snapshot.forEach((doc: any) => {
            const data: any = doc.data();
            sets.push({
                ...data,
                docId: doc.id,
                cards: JSON.parse(data.cards),
            });
        });
        resolve(sets);
    });
}
