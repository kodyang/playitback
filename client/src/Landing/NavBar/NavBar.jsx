import React, { Component } from "react";
import './NavBar.css';

import Cookies from 'js-cookie';

import { getHostUrl } from '../../Util/Utilities';

import querystring from 'querystring';
 

class NavBar extends Component {
  constructor() {
    super();
    this.state = {
      hasToken: false,
      username: null
    }
    this.handleLogin = this.handleLogin.bind(this);
  }

  generateRandomString(length) {
    var text = '';
    var possible = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
  
    for (var i = 0; i < length; i++) {
      text += possible.charAt(Math.floor(Math.random() * possible.length));
    }
    return text;
  }

  
  componentDidMount() {
    const client_id = "6a1c30408e274a138db63e15873fd540";
    const client_secret = "REMOVED";

    var spotUrl = new URL(window.location.href);
    var token = Cookies.get('spotify_auth_state');
    var hasToken = token != null;
  
    // A) Don't have anything. Do nothing.
    // B) Don't have token but have params. Load token, then C
    // C) Load username.

    console.log("code existance" + spotUrl.searchParams.get('code'))
    console.log("token existance" + hasToken)

    // A
    if (spotUrl.searchParams.get('code') == null && !hasToken) {
      return;
    }

    // B
    if (spotUrl.searchParams.get('code') != null) {
      var url1 = new URL('https://accounts.spotify.com/api/token');
      url1.searchParams.set('code', spotUrl.searchParams.get('code'));
      url1.searchParams.set('redirect_uri', "https://playitback.z9.web.core.windows.net");
      url1.searchParams.set('grant_type', 'authorization_code');
      // for (const [k, v] of spotUrl.searchParams) {
      //   url1.searchParams.set(k, v);
      // }
      // const formData = new FormData();
      // formData.append('code', spotUrl.searchParams.get('code'));
      // formData.append('redirect_uri', "http://localhost:8000/api/spotify/callback");
      // formData.append('grant_type', 'authorization_code');
      // var dict = {
      //   code: spotUrl.searchParams.get('code'),
      //   redirect_uri: "http://localhost:8000/api/spotify/callback",
      //   grant_type: 'authorization_code'
      // };

      var authOptions = {

        method: 'POST',
        headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
          'Authorization': 'Basic ' + (new Buffer(client_id + ':' + client_secret).toString('base64'))
        },
        // body: JSON.stringify(dict)
        // body: formData
      };

      var url2 = new URL(getHostUrl() + 'api/spotify/username');
      fetch(url1, authOptions)
      .then(useless => useless.json())
      .then(useless => {
        var access_token = useless.access_token;
        console.log('here' + access_token);
        // token = Cookies.get('spotify_auth_state');
        Cookies.set('spotify_auth_state', access_token);
        url2.searchParams.set('spotify_auth_state', access_token);
        fetch(url2, {
        })
        // .then(data => data.text()) 
        // .then(data => {
          // console.log(data);
        // })
        .then(data => data.json())
        .then(data => {
          if (data == null || data.email == null) {
            console.log("got failure")
            Cookies.remove('spotify_auth_state');
            this.setState({hasToken: false, username: null});
            return;
          }
  
          console.log(data);
          this.setState({hasToken: true, username: data.email});
      });
    });

      return;
    } 

    // C
    if (hasToken) {
      var url = new URL(getHostUrl() + 'api/spotify/username');
      var access_token = Cookies.get('spotify_auth_state');
      url.searchParams.set('spotify_auth_state', access_token);
      fetch(url, {
        // credentials: "include"
      })
      .then(data => data.json())
      .then(data => {
        console.log('not the here!!');
        if (data == null || data.email == null) {
          console.log("got failure")
          Cookies.remove('spotify_auth_state');
          this.setState({hasToken: false, username: null});
          return;
        }

        console.log(data);
        this.setState({hasToken: true, username: data.email});
      });
    } 
  }

  handleLogin(e) {
    const redirect_uri = "https://playitback.z9.web.core.windows.net";
    const client_id = "6a1c30408e274a138db63e15873fd540";
    const client_secret = "REMOVED";
    const scope = "user-read-private user-read-email user-read-recently-played"
    var stateKey = 'spotify_auth_state';

    var state = this.generateRandomString(16);
      Cookies.set(stateKey, state);

      var url = new URL('https://accounts.spotify.com/authorize?' + 
      querystring.stringify({
        response_type: 'code',
        client_id: client_id,
        scope: scope,
        redirect_uri: redirect_uri,
        state: state,
        show_dialog: true
      }));

      window.location.href = url;
      // redirec
      // fetch(url)
      // .then(data => data.text())
      // .then(data => {
      //   debugger
      //   console.log(data.query.code);
      //   Cookies.set(stateKey, data.state);
      //   }
      // );
  }

  render() {
    return (
      <React.Fragment>
        <nav className="navbar">
          {!this.state.hasToken ? 
            <a className="spotify-button btn nav-text" onClick={this.handleLogin}>
              Login with Spotify
            </a> : <div className="nav-text">{this.state.username}</div>
          }
        </nav>
      </React.Fragment>
    );
  }
}
 
export default NavBar;