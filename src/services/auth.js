import * as axios from 'axios';
import { state } from '../models/state';

export class AuthService {


    async auth() {
        try {
            const response = await axios.get(`/api/v1/user`, { withCredentials: true });
            state._loggedUser = response.data.body.user;
            return true;
        } catch (e) {
            throw e;
        }
    }

    async logOut() {
        window.location.href = `${state.configurations.SPARK_HOST}/en/logout`;
    }
}
