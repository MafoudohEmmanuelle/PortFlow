document.addEventListener('DOMContentLoaded', ()=>{
    if (Auth.isAuthenticated()){
        Auth.redirectToDashboard();
        return;
    }
    const form = document.getElementById('loginForm');
    const errorDiv= document.getElementById('errorMessage');
    const loginBtn= document.getElementById('loginBtn');
    const btnText= loginBtn?.querySelector('.btn-text');
    const btnSpinner = loginBtn?.querySelector('.btn-spinner');

    //Manage login form submit

    form?.addEventListener('submit', async (e) => {
        e.preventDefault();

        const email= document.getElementById('email').value.trim();
        const password= document.getElementById('password').value;
        if(!email || !password){
            showError("Veuillez remplir tous les champs");
            return;
        }
        if (!email.includes('@')){
            showError('Veuillez entrer un email valide');
            return;
        }
        //Desactiver le button pour afficher le spinner
        setLoading(true);

        /*try{
            const result= await AuthAPI.login(email,password);
            
            if (result.ok && result.data){
                Auth.redirectToDashboard();
            }else{
                const errorMsg = result.error||'Email ou mot de pas incorrect';
                showError(errorMsg);
            }
        }catch(error){
            showError('Erreur de connexion au serveur. Verifiez que le backend est démarré')
        }finally{
            setLoading(false)
        }*/
       try{
            const result= await AuthAPI.login(email,password);
            
            console.log('🔍 Résultat complet:', result);
            console.log('🔍 result.ok:', result.ok);
            console.log('🔍 result.data:', result.data);
            console.log('🔍 Token après login:', Storage.getToken());
            console.log('🔍 User après login:', Storage.getUser());
            
            if (result.ok && result.data){
                console.log('🔍 Appel de redirectToDashboard');
                Auth.redirectToDashboard();
            }else{
                const errorMsg = result.error||'Email ou mot de pas incorrect';
                showError(errorMsg);
            }
        }catch(error){
            console.error('🔍 Exception:', error);
            showError('Erreur de connexion au serveur. Verifiez que le backend est démarré')
        }finally{
            setLoading(false)
        }
    });

    function showError(message){
        if (errorDiv){
            errorDiv.textContent= message;
            errorDiv.style.display= 'block';

            setTimeout(()=>{
                errorDiv.style.display= 'none';
            },5000); 
        }
    }

    function setLoading(isLoading){
        if(!loginBtn) return;

        if (isLoading){
            loginBtn.disabled=true;
            if(btnText) btnText.textContent= 'Connection en cours...';
            if(btnSpinner)btnSpinner.style.display='inline';
        } else{
            loginBtn.disabled=false;
            if (btnText) btnText.textContent= 'Se connecter';
            if(btnSpinner) btnSpinner.style.display='none';
        }
    }

    const inputs =['email','password'];
    inputs.forEach(id=>{
        const input = document.getElementById(id);
        input?.addEventListener('keypress',(e)=>{
            if(e.key ==='Enter'){
                e.preventDefault();
                form?.dispatchEvent(new Event('submit'));
            }
        });
    });
});