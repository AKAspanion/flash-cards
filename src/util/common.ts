import router from '../router';

export const navigateToPath = (path: any) => {
    router.push({
        path,
    });
};
