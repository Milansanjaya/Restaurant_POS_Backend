@echo off
echo Creating Missing Backend Modules...

REM Create Suppliers Module
mkdir "src\modules\suppliers" 2>nul

REM Create Purchase Orders Module
mkdir "src\modules\purchase-orders" 2>nul

REM Create GRN Module
mkdir "src\modules\grn" 2>nul

REM Create Batches Module
mkdir "src\modules\batches" 2>nul

REM Create Customers Module
mkdir "src\modules\customers" 2>nul

REM Create Loyalty Module
mkdir "src\modules\loyalty" 2>nul

REM Create Categories Module
mkdir "src\modules\categories" 2>nul

REM Create Units Module
mkdir "src\modules\units" 2>nul

REM Create Companies Module (SaaS)
mkdir "src\modules\companies" 2>nul

REM Create Config Module
mkdir "src\modules\config" 2>nul

REM Create Returns Module
mkdir "src\modules\returns" 2>nul

echo All module folders created!
echo.
echo Next: Creating model, controller, and route files...
pause
