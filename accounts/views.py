
from django.shortcuts import redirect, render
from django.contrib.auth.models import User
from django.contrib.auth import authenticate, login , logout

from accounts.models import *
from django.contrib import messages



def signup(request):
       if request.method == "POST":
            username = request.POST.get("username")
            email = request.POST.get("email")
            password = request.POST.get("password")
            role = request.POST.get("role")
            admin_code = request.POST.get("admin_code")

            if not all([username, email, password, role]):
               messages.error(request, "All fields are required")
               return redirect("signup")
            
            if User.objects.filter(username=username).exists():
               messages.error(request, "Username already exists")
               return redirect("signup")
            
            if role == "admin":
               if admin_code != "Rohit5460":
                    messages.error(request, "Invalid admin code")
                    return redirect("signup")

            user = User.objects.create_user(
                username=username,
                email=email,
                password=password
            )
            if role == "user":
               Customer.objects.create(user=user)
            elif role == "admin":
               AdminUser.objects.create(user=user)


            messages.success(request, "Account created successfully. Please login.")   
            return redirect('login')
       
       return render(request, 'accounts/signup.html')


def login_p(request):
    if request.method == "POST":
        username = request.POST.get("username")
        password = request.POST.get("password")
        role = request.POST.get("role")

        user = authenticate(username=username, password=password)

        if user is None:
            messages.error(request, "Invalid username or password")
            return redirect("login")

        if role == "user":
            if Customer.objects.filter(user=user).exists():
                login(request, user)
                return redirect("home")
            else:
                messages.error(request, "You are not registered as a user")
                return redirect("login")

        if role == "admin":
            if AdminUser.objects.filter(user=user).exists():
                login(request, user)
                return redirect("admin_home")
            else:
                messages.error(request, "You are not registered as an admin")
                return redirect("login")

        messages.error(request, "Invalid login attempt")
        return redirect("login")

    return render(request, "accounts/login.html")

def logout_p(request):
    logout(request)
    messages.success(request, "You have been logged out")
    return redirect('login')