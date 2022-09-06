import { expectSaga } from 'redux-saga-test-plan';
import { StatusCodes } from 'http-status-codes';
import { identity } from 'ramda';
import { server } from '../../../mocks/server';
import { watchAuth } from '../auth.sagas';
import {
  mockChangePassword,
  mockConfirmEmail,
  mockConfirmPasswordReset,
  mockLogout,
  mockRequestPasswordReset,
  mockSignup,
} from '../../../mocks/server/handlers';
import { browserHistory } from '../../../shared/utils/history';
import { prepareState } from '../../../mocks/store';
import { snackbarActions } from '../../snackbar';
import { OAuthProvider } from '../auth.types';
import { authActions } from '..';
import { apiURL } from '../../../shared/services/api/helpers';

jest.mock('../../../shared/utils/history');

const credentials = {
  email: 'user@mail.com',
  password: 'password',
};

describe('Auth: sagas', () => {
  const defaultState = prepareState(identity);
  const mockHistoryPush = browserHistory.push as jest.Mock;

  const originalLocation = window.location;
  const locationAssignSpy = jest.fn();

  beforeAll(() => {
    // @ts-ignore
    delete window.location;
    window.location = {
      ...originalLocation,
      assign: locationAssignSpy,
    };
  });

  afterAll(() => (window.location = originalLocation));

  beforeEach(() => {
    mockHistoryPush.mockReset();
    locationAssignSpy.mockReset();
  });

  describe('logout', () => {
    describe('call completes successfully', () => {
      it('should resolve action', async () => {
        await expectSaga(watchAuth)
          .withState(defaultState)
          // @ts-ignore
          .put(authActions.logout.resolved(''))
          .dispatch(authActions.logout())
          .silentRun();
      });

      describe('user is logged in', () => {
        it('should redirect to login page', async () => {
          const state = prepareState((state) => state);

          await expectSaga(watchAuth).withState(state).dispatch(authActions.logout()).silentRun();
          expect(mockHistoryPush).toHaveBeenCalledWith('/en/auth/login');
        });
      });
    });

    describe('call completes with error', () => {
      it('should not redirect anywhere', async () => {
        server.use(mockLogout(StatusCodes.INTERNAL_SERVER_ERROR));
        await expectSaga(watchAuth).withState(defaultState).dispatch(authActions.logout()).silentRun();
        expect(mockHistoryPush).not.toHaveBeenCalled();
      });
    });
  });

  describe('signup', () => {
    describe('call completes successfully', () => {
      it('should resolve action', async () => {
        server.use(mockSignup({ isError: false }));

        await expectSaga(watchAuth)
          .withState(defaultState)
          .put(authActions.signup.resolved({ isError: false }))
          .dispatch(authActions.signup(credentials))
          .silentRun();
      });

      it('should redirect to homepage', async () => {
        await expectSaga(watchAuth).withState(defaultState).dispatch(authActions.signup(credentials)).silentRun();
        expect(mockHistoryPush).toHaveBeenCalledWith('/en/');
      });
    });

    it('should reject action if call completes with error', async () => {
      server.use(
        mockSignup({ isError: true, password: [{ message: 'error', code: 'error' }] }, StatusCodes.BAD_REQUEST)
      );

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(authActions.signup.resolved({ isError: true, password: [{ message: 'error', code: 'error' }] }))
        .dispatch(authActions.signup(credentials))
        .silentRun();
    });

    it('should prompt snackbar error if call completes with unexpected error', async () => {
      server.use(mockSignup({ isError: true }, StatusCodes.INTERNAL_SERVER_ERROR));

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(snackbarActions.showMessage(null))
        .dispatch(authActions.signup(credentials))
        .silentRun();
    });
  });

  describe('changePassword', () => {
    const changePasswordPayload = {
      oldPassword: 'old-pass',
      newPassword: 'new-pass',
    };

    it('should resolve action if call completes successfully', async () => {
      server.use(mockChangePassword({ isError: false }));

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(authActions.changePassword.resolved({ isError: false }))
        .dispatch(authActions.changePassword(changePasswordPayload))
        .silentRun();
    });

    it('should reject action if call completes with error', async () => {
      server.use(
        mockChangePassword(
          { isError: true, oldPassword: [{ message: 'error', code: 'error' }] },
          StatusCodes.BAD_REQUEST
        )
      );

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(authActions.changePassword.resolved({ isError: true, oldPassword: [{ message: 'error', code: 'error' }] }))
        .dispatch(authActions.changePassword(changePasswordPayload))
        .silentRun();
    });

    it('should prompt snackbar error if call completes with unexpected error', async () => {
      server.use(mockChangePassword({ isError: true }, StatusCodes.INTERNAL_SERVER_ERROR));

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(snackbarActions.showMessage(null))
        .dispatch(authActions.changePassword(changePasswordPayload))
        .silentRun();
    });
  });

  describe('confirmEmail', () => {
    const confirmEmailPayload = {
      user: 'user_id',
      token: 'token_value',
    };

    it('should resolve action if call completes successfully', async () => {
      server.use(mockConfirmEmail({ isError: false }));

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(authActions.confirmEmail.resolved({ isError: false }))
        .dispatch(authActions.confirmEmail(confirmEmailPayload))
        .silentRun();
    });

    it('should reject action if call completes with error', async () => {
      server.use(mockConfirmEmail({ isError: true }, StatusCodes.BAD_REQUEST));

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(authActions.confirmEmail.resolved({ isError: true }))
        .dispatch(authActions.confirmEmail(confirmEmailPayload))
        .silentRun();
    });
  });

  describe('requestPasswordReset', () => {
    const requestPasswordResetPayload = {
      email: 'user@mail.com',
    };

    it('should resolve action if call completes successfully', async () => {
      server.use(mockRequestPasswordReset({ isError: false }));

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(authActions.requestPasswordReset.resolved({ isError: false }))
        .dispatch(authActions.requestPasswordReset(requestPasswordResetPayload))
        .silentRun();
    });

    it('should reject action if call completes with error', async () => {
      server.use(mockRequestPasswordReset({ isError: true }, StatusCodes.BAD_REQUEST));

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(authActions.requestPasswordReset.resolved({ isError: true }))
        .dispatch(authActions.requestPasswordReset(requestPasswordResetPayload))
        .silentRun();
    });

    it('should prompt snackbar error if call completes with unexpected error', async () => {
      server.use(mockRequestPasswordReset({ isError: true }, StatusCodes.INTERNAL_SERVER_ERROR));

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(snackbarActions.showMessage(null))
        .dispatch(authActions.requestPasswordReset(requestPasswordResetPayload))
        .silentRun();
    });
  });

  describe('confirmPasswordReset', () => {
    const confirmPasswordResetPayload = {
      newPassword: 'user_id',
      user: 'user-id',
      token: 'token',
    };

    it('should resolve action if call completes successfully', async () => {
      server.use(mockConfirmPasswordReset({ isError: false }));

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(authActions.confirmPasswordReset.resolved({ isError: false }))
        .dispatch(authActions.confirmPasswordReset(confirmPasswordResetPayload))
        .silentRun();
    });

    it('should reject action if call completes with error', async () => {
      server.use(mockConfirmPasswordReset({ isError: true }, StatusCodes.BAD_REQUEST));

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(authActions.confirmPasswordReset.resolved({ isError: true }))
        .dispatch(authActions.confirmPasswordReset(confirmPasswordResetPayload))
        .silentRun();
    });

    it('should prompt snackbar error if call completes with unexpected error', async () => {
      server.use(mockConfirmPasswordReset({ isError: true }, StatusCodes.INTERNAL_SERVER_ERROR));

      await expectSaga(watchAuth)
        .withState(defaultState)
        .put(snackbarActions.showMessage(null))
        .dispatch(authActions.confirmPasswordReset(confirmPasswordResetPayload))
        .silentRun();
    });
  });

  describe('oAuthLogin', () => {
    describe('for google provider', () => {
      it('should redirect to google OAuth url', async () => {
        await expectSaga(watchAuth)
          .withState(defaultState)
          .dispatch(authActions.oAuthLogin(OAuthProvider.Google))
          .silentRun();
        const encodedNextUrl = encodeURIComponent('http://localhost');
        expect(locationAssignSpy).toHaveBeenCalledWith(
          apiURL(`/auth/social/login/google-oauth2?next=${encodedNextUrl}`)
        );
      });
    });

    describe('for facebook provider', () => {
      it('should redirect to facebook OAuth url', async () => {
        await expectSaga(watchAuth)
          .withState(defaultState)
          .dispatch(authActions.oAuthLogin(OAuthProvider.Facebook))
          .silentRun();
        const encodedNextUrl = encodeURIComponent('http://localhost');
        expect(locationAssignSpy).toHaveBeenCalledWith(apiURL(`/auth/social/login/facebook?next=${encodedNextUrl}`));
      });
    });
  });
});
